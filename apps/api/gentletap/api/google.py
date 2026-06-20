from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import EmailPreference, EmailSender, GoogleConnection, get_db
from gentletap.dependencies import CurrentUser
from gentletap.integrations.google import oauth as google_oauth
from gentletap.integrations.resend import sender as resend_sender
from gentletap.services.email_router import get_send_provider
from gentletap.utils.crypto import decrypt_token
from urllib.parse import quote

router = APIRouter(prefix="/google", tags=["google"])


@router.get("/connect-url")
def google_connect_url(
    user: CurrentUser,
    return_to: str = Query("onboarding", pattern="^(onboarding|settings)$"),
) -> dict:
    if not google_oauth.is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google OAuth is not configured",
        )
    return {
        "authorization_url": google_oauth.create_authorization_url(
            user.id,
            return_to=return_to,
            login_hint=user.email,
        ),
    }


@router.get("/callback")
def google_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    settings = get_settings()
    stored = google_oauth.get_oauth_state(state)
    return_to = (stored or {}).get("return_to", "onboarding")
    try:
        google_oauth.handle_oauth_callback(db, code=code, state=state)
    except ValueError as exc:
        if return_to == "settings":
            dest = f"{settings.web_url}/settings/connections?email=error&message={quote(str(exc))}"
        else:
            dest = f"{settings.web_url}/onboarding?email=error&message={quote(str(exc))}"
        return RedirectResponse(url=dest, status_code=status.HTTP_302_FOUND)

    if return_to == "settings":
        dest = f"{settings.web_url}/settings/connections?email=connected"
    else:
        dest = f"{settings.web_url}/onboarding?email=connected"
    return RedirectResponse(url=dest, status_code=status.HTTP_302_FOUND)


@router.get("/status")
def google_status(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    conn = (
        db.query(GoogleConnection)
        .filter(GoogleConnection.user_id == user.id, GoogleConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    if conn is None:
        return {"connected": False}
    return {"connected": True, "email": conn.google_email}


@router.post("/disconnect")
def google_disconnect(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    connection = (
        db.query(GoogleConnection)
        .filter(
            GoogleConnection.user_id == user.id,
            GoogleConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        return {"status": "not_connected"}

    try:
        refresh = decrypt_token(connection.refresh_token_enc)
        if refresh:
            google_oauth.revoke_token(refresh)
        else:
            google_oauth.revoke_token(decrypt_token(connection.access_token_enc))
    except Exception:
        pass

    connection.disconnected_at = datetime.now(UTC)
    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
    if pref and pref.send_provider == "google":
        pref.send_provider = "resend"
    db.commit()
    return {"status": "disconnected"}


email_router = APIRouter(prefix="/email", tags=["email"])


class VerifySenderRequest(BaseModel):
    email: EmailStr


class EmailPreferencesRequest(BaseModel):
    send_provider: str


@email_router.post("/sender/verify")
def verify_sender(body: VerifySenderRequest, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if not resend_sender.is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resend is not configured")
    sender = resend_sender.start_sender_verification(db, user.id, body.email.lower())
    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
    if pref is None:
        pref = EmailPreference(user_id=user.id, send_provider="resend")
        db.add(pref)
    else:
        pref.send_provider = "resend"
    db.commit()
    return {
        "email": sender.email_address,
        "status": sender.verification_status,
        "message": "Check your inbox for the verification link from Resend",
    }


@email_router.get("/sender/status")
def sender_status(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    sender = (
        db.query(EmailSender)
        .filter(EmailSender.user_id == user.id, EmailSender.is_primary.is_(True))
        .one_or_none()
    )
    if sender is None:
        return {"verified": False}
    sender = resend_sender.refresh_sender_status(db, sender)
    if sender.verification_status == "verified" and user.onboarding_step == "email":
        user.onboarding_step = "pricing"
        db.commit()
    return {
        "email": sender.email_address,
        "verified": sender.verification_status == "verified",
        "status": sender.verification_status,
    }


@email_router.put("/preferences")
def set_preferences(
    body: EmailPreferencesRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    if body.send_provider not in ("google", "resend"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid provider")
    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
    if pref is None:
        pref = EmailPreference(user_id=user.id, send_provider=body.send_provider)
        db.add(pref)
    else:
        pref.send_provider = body.send_provider
    db.commit()
    return {"send_provider": pref.send_provider}


@email_router.get("/status")
def email_status(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    provider = get_send_provider(db, user.id)
    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
    return {
        "provider": provider,
        "require_approval": pref.require_approval if pref else True,
        "ready": provider is not None,
    }

from datetime import UTC, datetime

import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import EmailDomain, EmailPreference, EmailSender, GoogleConnection, Profile, get_db
from gentletap.dependencies import CurrentUser
from gentletap.integrations.google import oauth as google_oauth
from gentletap.integrations.resend import domains as resend_domains
from gentletap.integrations.resend import sender as resend_sender
from gentletap.rate_limit import limiter
from gentletap.services.email_platform import domain_from_preview, platform_available, platform_from_address
from gentletap.services.email_router import get_send_provider
from gentletap.utils.crypto import decrypt_token
from urllib.parse import quote

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/google", tags=["google"])


@router.get("/connect-url")
@limiter.limit("30/minute")
def google_connect_url(
    request: Request,
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
@limiter.limit("60/minute")
def google_callback(
    request: Request,
    code: str | None = Query(None),
    state: str = Query(...),
    error: str | None = Query(None),
    db: Session = Depends(get_db),
) -> RedirectResponse:
    settings = get_settings()
    stored = google_oauth.get_oauth_state(state)
    return_to = (stored or {}).get("return_to", "onboarding")
    if error or not code:
        # User denied access (or Google returned an error) — no code is sent.
        message = quote("Google connection was cancelled")
        if return_to == "settings":
            dest = f"{settings.web_url}/settings/email?email=error&message={message}"
        else:
            dest = f"{settings.web_url}/onboarding?email=error&message={message}"
        return RedirectResponse(url=dest, status_code=status.HTTP_302_FOUND)
    try:
        google_oauth.handle_oauth_callback(db, code=code, state=state)
    except ValueError as exc:
        if return_to == "settings":
            dest = f"{settings.web_url}/settings/email?email=error&message={quote(str(exc))}"
        else:
            dest = f"{settings.web_url}/onboarding?email=error&message={quote(str(exc))}"
        return RedirectResponse(url=dest, status_code=status.HTTP_302_FOUND)
    except Exception:
        logger.exception("Google OAuth callback failed")
        message = quote("Google connection failed — please try again")
        if return_to == "settings":
            dest = f"{settings.web_url}/settings/email?email=error&message={message}"
        else:
            dest = f"{settings.web_url}/onboarding?email=error&message={message}"
        return RedirectResponse(url=dest, status_code=status.HTTP_302_FOUND)

    if return_to == "settings":
        dest = f"{settings.web_url}/settings/email?email=connected"
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


class DomainSetupRequest(BaseModel):
    domain_or_email: str = Field(min_length=3, max_length=320)


def _advance_email_onboarding(user: Profile, db: Session) -> None:
    if user.onboarding_step == "email":
        user.onboarding_step = "preview"


def _set_provider(db: Session, user_id, provider: str) -> EmailPreference:
    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user_id).one_or_none()
    if pref is None:
        pref = EmailPreference(user_id=user_id, send_provider=provider)
        db.add(pref)
    else:
        pref.send_provider = provider
    return pref


@email_router.get("/setup")
def email_setup(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    conn = (
        db.query(GoogleConnection)
        .filter(GoogleConnection.user_id == user.id, GoogleConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    domain_row = db.query(EmailDomain).filter(EmailDomain.user_id == user.id).one_or_none()
    if domain_row:
        domain_row = resend_domains.refresh_domain(db, domain_row)

    provider = get_send_provider(db, user.id)
    platform_ok = platform_available(settings)
    domain_name = domain_row.domain if domain_row else None

    return {
        "provider": provider,
        "ready": provider is not None,
        "platform_available": platform_ok,
        "platform_from": platform_from_address(user) if platform_ok else None,
        "platform_reply_to": user.email,
        "domain_from_preview": domain_from_preview(user, domain_name or "yourcompany.com"),
        "google_connected": conn is not None,
        "google_email": conn.google_email if conn else None,
        "domain": None
        if domain_row is None
        else {
            "domain": domain_row.domain,
            "status": domain_row.verification_status,
            "verified": domain_row.verification_status == "verified",
            "records": resend_domains.fetch_domain_records(domain_row),
        },
    }


@email_router.post("/platform")
def enable_platform_sender(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if not platform_available():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Platform sender is not configured")
    _set_provider(db, user.id, "platform")
    _advance_email_onboarding(user, db)
    db.commit()
    return {"provider": "platform", "from": platform_from_address(user), "reply_to": user.email}


@email_router.post("/domain")
def start_domain_setup(body: DomainSetupRequest, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if not resend_sender.is_configured():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resend is not configured")
    try:
        domain_name = resend_domains.parse_domain_input(body.domain_or_email)
        row = resend_domains.create_domain(db, user.id, domain_name)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    _set_provider(db, user.id, "resend")
    db.commit()
    return {
        "domain": row.domain,
        "status": row.verification_status,
        "records": resend_domains.fetch_domain_records(row),
    }


@email_router.post("/domain/verify")
def verify_domain(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    row = db.query(EmailDomain).filter(EmailDomain.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No domain setup in progress")
    try:
        row = resend_domains.verify_domain(db, row)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "domain": row.domain,
        "status": row.verification_status,
        "verified": row.verification_status == "verified",
        "records": resend_domains.fetch_domain_records(row),
    }


@email_router.post("/domain/continue")
def continue_domain_setup(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    row = db.query(EmailDomain).filter(EmailDomain.user_id == user.id).one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Start domain setup first")
    _set_provider(db, user.id, "resend")
    _advance_email_onboarding(user, db)
    db.commit()
    return {"provider": "resend", "domain": row.domain, "status": row.verification_status}


@email_router.delete("/domain")
def cancel_domain_setup(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    row = db.query(EmailDomain).filter(EmailDomain.user_id == user.id).one_or_none()
    if row is None:
        return {"status": "none"}
    resend_domains.delete_domain(db, row)
    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
    if pref and pref.send_provider == "resend":
        google = (
            db.query(GoogleConnection)
            .filter(GoogleConnection.user_id == user.id, GoogleConnection.disconnected_at.is_(None))
            .one_or_none()
        )
        if google:
            pref.send_provider = "google"
        elif platform_available():
            pref.send_provider = "platform"
        else:
            db.delete(pref)
    db.commit()
    return {"status": "cancelled"}


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
        user.onboarding_step = "preview"
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
    if body.send_provider not in ("google", "resend", "platform"):
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

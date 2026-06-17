"""Gmail OAuth — send-only scope."""

import base64
import secrets
from datetime import UTC, datetime, timedelta
from email.mime.text import MIMEText
from urllib.parse import urlencode
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import EmailPreference, GoogleConnection, Profile
from gentletap.utils.crypto import decrypt_token, encrypt_token
from gentletap.utils.redis_client import delete_key, get_json, set_json

OAUTH_STATE_TTL = 600
SCOPE = "https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"

GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me/messages/send"


def _state_key(state: str) -> str:
    return f"google_oauth_state:{state}"


def is_configured(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    return bool(cfg.google_client_id and cfg.google_client_secret)


def create_authorization_url(user_id: UUID, settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    if not is_configured(cfg):
        raise ValueError("Google OAuth is not configured")

    state = secrets.token_urlsafe(32)
    set_json(_state_key(state), {"user_id": str(user_id)}, ttl_seconds=OAUTH_STATE_TTL)
    params = {
        "client_id": cfg.google_client_id,
        "response_type": "code",
        "scope": SCOPE,
        "redirect_uri": cfg.google_redirect_uri,
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def _exchange_token(*, grant_type: str, code: str | None = None, refresh_token: str | None = None) -> dict:
    cfg = get_settings()
    data: dict[str, str] = {
        "client_id": cfg.google_client_id,
        "client_secret": cfg.google_client_secret,
        "grant_type": grant_type,
    }
    if grant_type == "authorization_code":
        data["code"] = code or ""
        data["redirect_uri"] = cfg.google_redirect_uri
    elif grant_type == "refresh_token":
        data["refresh_token"] = refresh_token or ""

    with httpx.Client(timeout=30.0) as client:
        response = client.post(TOKEN_URL, data=data)
        response.raise_for_status()
        return response.json()


def handle_oauth_callback(db: Session, *, code: str, state: str) -> Profile:
    stored = get_json(_state_key(state))
    if not stored:
        raise ValueError("Invalid or expired OAuth state")

    user = db.query(Profile).filter(Profile.id == UUID(stored["user_id"])).one_or_none()
    if user is None:
        raise ValueError("User not found")

    tokens = _exchange_token(grant_type="authorization_code", code=code)
    expires_at = datetime.now(UTC) + timedelta(seconds=int(tokens.get("expires_in", 3600)))

    with httpx.Client(timeout=30.0) as client:
        userinfo = client.get(
            "https://www.googleapis.com/oauth2/v2/userinfo",
            headers={"Authorization": f"Bearer {tokens['access_token']}"},
        )
        userinfo.raise_for_status()
        google_email = userinfo.json().get("email", "")

    connection = db.query(GoogleConnection).filter(GoogleConnection.user_id == user.id).one_or_none()
    if connection is None:
        connection = GoogleConnection(user_id=user.id, google_email=google_email)
        db.add(connection)

    connection.google_email = google_email
    connection.access_token_enc = encrypt_token(tokens["access_token"])
    connection.refresh_token_enc = encrypt_token(tokens.get("refresh_token", ""))
    connection.token_expires_at = expires_at
    connection.connected_at = datetime.now(UTC)
    connection.disconnected_at = None

    user.onboarding_step = "preview"

    delete_key(_state_key(state))

    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
    if pref is None:
        db.add(EmailPreference(user_id=user.id, send_provider="google"))
    else:
        pref.send_provider = "google"

    db.commit()
    db.refresh(user)
    return user

def refresh_connection_tokens(db: Session, connection: GoogleConnection) -> None:
    refresh = decrypt_token(connection.refresh_token_enc)
    if not refresh:
        raise ValueError("Google refresh token missing — reconnect Gmail")
    tokens = _exchange_token(grant_type="refresh_token", refresh_token=refresh)
    connection.access_token_enc = encrypt_token(tokens["access_token"])
    if tokens.get("refresh_token"):
        connection.refresh_token_enc = encrypt_token(tokens["refresh_token"])
    connection.token_expires_at = datetime.now(UTC) + timedelta(seconds=int(tokens.get("expires_in", 3600)))
    db.commit()


def _ensure_access_token(db: Session, connection: GoogleConnection) -> str:
    if connection.token_expires_at:
        expires = connection.token_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= datetime.now(UTC) + timedelta(minutes=5):
            refresh_connection_tokens(db, connection)
    return decrypt_token(connection.access_token_enc)


def send_email(
    db: Session,
    connection: GoogleConnection,
    *,
    to: str,
    subject: str,
    body: str,
) -> str:
    access_token = _ensure_access_token(db, connection)
    msg = MIMEText(body)
    msg["to"] = to
    msg["from"] = connection.google_email
    msg["subject"] = subject
    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()

    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            GMAIL_API,
            headers={"Authorization": f"Bearer {access_token}"},
            json={"raw": raw},
        )
        if response.status_code == 401:
            refresh_connection_tokens(db, connection)
            access_token = decrypt_token(connection.access_token_enc)
            response = client.post(
                GMAIL_API,
                headers={"Authorization": f"Bearer {access_token}"},
                json={"raw": raw},
            )
        response.raise_for_status()
        return response.json().get("id", "")

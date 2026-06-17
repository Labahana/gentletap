"""Google OAuth for sign-up and login (openid + profile + email)."""

import secrets
from urllib.parse import urlencode
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import Profile
from gentletap.integrations.google.oauth import is_configured
from gentletap.services.auth import hash_password, issue_token_pair
from gentletap.utils.redis_client import delete_key, get_json, set_json

OAUTH_STATE_TTL = 600
EXCHANGE_TTL = 120
AUTH_SCOPE = "openid email profile"
AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


def _state_key(state: str) -> str:
    return f"google_auth_state:{state}"


def _exchange_key(code: str) -> str:
    return f"google_auth_exchange:{code}"


def auth_redirect_uri(settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    return (cfg.google_auth_redirect_uri or "").strip() or cfg.google_redirect_uri.replace(
        "/google/callback", "/auth/google/callback"
    )


def create_signin_authorization_url(*, intent: str = "signup") -> str:
    cfg = get_settings()
    if not is_configured(cfg):
        raise ValueError("Google OAuth is not configured")

    state = secrets.token_urlsafe(32)
    set_json(
        _state_key(state),
        {"intent": intent},
        ttl_seconds=OAUTH_STATE_TTL,
    )
    params = {
        "client_id": cfg.google_client_id,
        "response_type": "code",
        "scope": AUTH_SCOPE,
        "redirect_uri": auth_redirect_uri(cfg),
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def _exchange_code(code: str) -> dict:
    cfg = get_settings()
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            TOKEN_URL,
            data={
                "client_id": cfg.google_client_id,
                "client_secret": cfg.google_client_secret,
                "code": code,
                "grant_type": "authorization_code",
                "redirect_uri": auth_redirect_uri(cfg),
            },
        )
        response.raise_for_status()
        return response.json()


def _fetch_userinfo(access_token: str) -> dict:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            USERINFO_URL,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


def _find_or_create_user(db: Session, *, email: str, full_name: str | None) -> Profile:
    normalized = email.lower()
    user = db.query(Profile).filter(Profile.email == normalized).first()
    if user:
        if full_name and not user.full_name:
            user.full_name = full_name
            db.commit()
            db.refresh(user)
        return user

    user = Profile(
        email=normalized,
        password_hash=hash_password(secrets.token_urlsafe(32)),
        full_name=full_name,
        onboarding_step="account",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def handle_signin_callback(db: Session, *, code: str, state: str) -> str:
    stored = get_json(_state_key(state))
    if not stored:
        raise ValueError("Invalid or expired OAuth state")

    tokens = _exchange_code(code)
    userinfo = _fetch_userinfo(tokens["access_token"])
    email = userinfo.get("email")
    if not email:
        raise ValueError("Google did not return an email address")

    user = _find_or_create_user(
        db,
        email=email,
        full_name=userinfo.get("name"),
    )
    delete_key(_state_key(state))

    exchange_code = secrets.token_urlsafe(32)
    set_json(_exchange_key(exchange_code), {"user_id": str(user.id)}, ttl_seconds=EXCHANGE_TTL)
    return exchange_code


def exchange_signin_code(db: Session, code: str) -> tuple[Profile, str, str]:
    stored = get_json(_exchange_key(code))
    if not stored:
        raise ValueError("Invalid or expired sign-in code")

    user = db.query(Profile).filter(Profile.id == UUID(stored["user_id"])).one_or_none()
    if user is None:
        raise ValueError("User not found")

    delete_key(_exchange_key(code))
    access, refresh = issue_token_pair(db, user)
    return user, access, refresh

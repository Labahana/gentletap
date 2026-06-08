import base64
import secrets
from datetime import UTC, datetime, timedelta
from urllib.parse import urlencode
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import Profile, QuickBooksConnection
from gentletap.utils.crypto import encrypt_token
from gentletap.utils.redis_client import get_json, set_json

OAUTH_STATE_TTL = 600
SCOPE = "com.intuit.quickbooks.accounting"
AUTH_URL = "https://appcenter.intuit.com/connect/oauth2"
TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer"
REVOKE_URL = "https://developer.api.intuit.com/v2/oauth2/tokens/revoke"


def _oauth_state_key(state: str) -> str:
    return f"qb_oauth_state:{state}"


def _basic_auth_header(client_id: str, client_secret: str) -> str:
    raw = f"{client_id}:{client_secret}"
    return base64.b64encode(raw.encode()).decode()


def is_configured(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    return bool(cfg.intuit_client_id and cfg.intuit_client_secret)


def create_authorization_url(user_id: UUID, settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    if not is_configured(cfg):
        raise ValueError("QuickBooks OAuth is not configured")

    state = secrets.token_urlsafe(32)
    set_json(_oauth_state_key(state), {"user_id": str(user_id)}, ttl_seconds=OAUTH_STATE_TTL)

    params = {
        "client_id": cfg.intuit_client_id,
        "response_type": "code",
        "scope": SCOPE,
        "redirect_uri": cfg.intuit_redirect_uri,
        "state": state,
    }
    return f"{AUTH_URL}?{urlencode(params)}"


def _exchange_token(
    *,
    grant_type: str,
    code: str | None = None,
    refresh_token: str | None = None,
    settings: Settings | None = None,
) -> dict:
    cfg = settings or get_settings()
    data: dict[str, str] = {"grant_type": grant_type}
    if grant_type == "authorization_code":
        data["code"] = code or ""
        data["redirect_uri"] = cfg.intuit_redirect_uri
    elif grant_type == "refresh_token":
        data["refresh_token"] = refresh_token or ""

    headers = {
        "Authorization": f"Basic {_basic_auth_header(cfg.intuit_client_id, cfg.intuit_client_secret)}",
        "Accept": "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
    }

    with httpx.Client(timeout=30.0) as client:
        response = client.post(TOKEN_URL, data=data, headers=headers)
        response.raise_for_status()
        return response.json()


def handle_oauth_callback(
    db: Session,
    *,
    code: str,
    state: str,
    realm_id: str,
    settings: Settings | None = None,
) -> Profile:
    cfg = settings or get_settings()
    stored = get_json(_oauth_state_key(state))
    if not stored or "user_id" not in stored:
        raise ValueError("Invalid or expired OAuth state")

    user_id = UUID(stored["user_id"])
    user = db.get(Profile, user_id)
    if user is None:
        raise ValueError("User not found")

    token_data = _exchange_token(grant_type="authorization_code", code=code, settings=cfg)
    return _upsert_connection(db, user, realm_id, token_data)


def refresh_connection_tokens(
    db: Session,
    connection: QuickBooksConnection,
    settings: Settings | None = None,
) -> QuickBooksConnection:
    from gentletap.utils.crypto import decrypt_token

    cfg = settings or get_settings()
    refresh_token = decrypt_token(connection.refresh_token_enc)
    token_data = _exchange_token(grant_type="refresh_token", refresh_token=refresh_token, settings=cfg)

    connection.access_token_enc = encrypt_token(token_data["access_token"])
    connection.refresh_token_enc = encrypt_token(token_data["refresh_token"])
    connection.token_expires_at = datetime.now(UTC) + timedelta(seconds=int(token_data.get("expires_in", 3600)))
    db.commit()
    db.refresh(connection)
    return connection


def _upsert_connection(
    db: Session,
    user: Profile,
    realm_id: str,
    token_data: dict,
) -> Profile:
    now = datetime.now(UTC)
    expires_at = now + timedelta(seconds=int(token_data.get("expires_in", 3600)))

    connection = (
        db.query(QuickBooksConnection)
        .filter(QuickBooksConnection.user_id == user.id)
        .one_or_none()
    )
    if connection is None:
        connection = QuickBooksConnection(
            user_id=user.id,
            realm_id=realm_id,
            access_token_enc=encrypt_token(token_data["access_token"]),
            refresh_token_enc=encrypt_token(token_data["refresh_token"]),
            token_expires_at=expires_at,
            connected_at=now,
            disconnected_at=None,
        )
        db.add(connection)
    else:
        connection.realm_id = realm_id
        connection.access_token_enc = encrypt_token(token_data["access_token"])
        connection.refresh_token_enc = encrypt_token(token_data["refresh_token"])
        connection.token_expires_at = expires_at
        connection.connected_at = now
        connection.disconnected_at = None

    user.onboarding_step = "import"
    db.commit()
    db.refresh(user)
    db.refresh(connection)
    return user


def revoke_tokens(access_token: str, settings: Settings | None = None) -> None:
    cfg = settings or get_settings()
    headers = {
        "Authorization": f"Basic {_basic_auth_header(cfg.intuit_client_id, cfg.intuit_client_secret)}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    with httpx.Client(timeout=30.0) as client:
        response = client.post(REVOKE_URL, json={"token": access_token}, headers=headers)
        if response.status_code not in (200, 204):
            response.raise_for_status()

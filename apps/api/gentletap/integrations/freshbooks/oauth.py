"""FreshBooks OAuth 2.0 via the official freshbooks-sdk Client."""

import secrets
from datetime import UTC, datetime, timedelta
from uuid import UUID

from freshbooks import Client as FreshBooksSDK
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import FreshBooksConnection, Profile
from gentletap.utils.crypto import decrypt_token, encrypt_token
from gentletap.utils.redis_client import delete_key, get_json, set_json

OAUTH_STATE_TTL = 600
# FreshBooks access tokens expire in 12 hours; refresh tokens yield a new pair without re-auth.
ACCESS_TOKEN_TTL_SECONDS = 43_200
# Least privilege for GentleTap: sync clients/invoices, detect payments, register webhooks.
DEFAULT_SCOPES = [
    "user:profile:read",
    "user:clients:read",
    "user:invoices:read",
    "user:payments:read",
]


def _normalize_expires_at(expires_at: datetime | None) -> datetime:
    """Prefer SDK expiry; fall back to the documented 12h (43,200s) access-token lifetime."""
    if expires_at is None:
        return datetime.now(UTC) + timedelta(seconds=ACCESS_TOKEN_TTL_SECONDS)
    if expires_at.tzinfo is None:
        return expires_at.replace(tzinfo=UTC)
    return expires_at


def _oauth_state_key(state: str) -> str:
    return f"fb_oauth_state:{state}"


def is_configured(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    return bool(cfg.freshbooks_client_id and cfg.freshbooks_client_secret)


def _sdk_client(
    *,
    access_token: str | None = None,
    refresh_token: str | None = None,
    settings: Settings | None = None,
) -> FreshBooksSDK:
    cfg = settings or get_settings()
    return FreshBooksSDK(
        client_id=cfg.freshbooks_client_id,
        client_secret=cfg.freshbooks_client_secret or None,
        redirect_uri=cfg.freshbooks_redirect_uri or None,
        access_token=access_token,
        refresh_token=refresh_token,
        user_agent="GentleTap/1.0 (freshbooks-sdk)",
    )


def create_authorization_url(user_id: UUID, settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    if not is_configured(cfg):
        raise ValueError("FreshBooks OAuth is not configured")

    state = secrets.token_urlsafe(32)
    set_json(_oauth_state_key(state), {"user_id": str(user_id)}, ttl_seconds=OAUTH_STATE_TTL)

    client = _sdk_client(settings=cfg)
    # SDK builds authorize URL; we append state for CSRF binding.
    base = client.get_auth_request_url(scopes=DEFAULT_SCOPES)
    sep = "&" if "?" in base else "?"
    return f"{base}{sep}state={state}"


def handle_oauth_callback(
    db: Session,
    *,
    code: str,
    state: str,
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

    client = _sdk_client(settings=cfg)
    tokens = client.get_access_token(code)
    delete_key(_oauth_state_key(state))

    identity = client.current_user()
    account_id, business_id, business_name = _pick_business(identity)
    if not account_id:
        raise ValueError("No FreshBooks business account found for this user")

    return _upsert_connection(
        db,
        user,
        account_id=account_id,
        business_id=business_id,
        business_name=business_name,
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
        expires_at=tokens.access_token_expires_at,
    )


def refresh_connection_tokens(
    db: Session,
    connection: FreshBooksConnection,
    settings: Settings | None = None,
) -> FreshBooksConnection:
    cfg = settings or get_settings()
    refresh_token = decrypt_token(connection.refresh_token_enc)
    client = _sdk_client(refresh_token=refresh_token, settings=cfg)
    tokens = client.refresh_access_token(refresh_token)

    # Refresh tokens are rotated — always persist the new refresh token with the access token.
    connection.access_token_enc = encrypt_token(tokens.access_token)
    connection.refresh_token_enc = encrypt_token(tokens.refresh_token)
    connection.token_expires_at = _normalize_expires_at(tokens.access_token_expires_at)
    db.commit()
    db.refresh(connection)
    return connection


def _pick_business(identity) -> tuple[str | None, int | None, str | None]:
    """Prefer an owner/admin membership that has an accounting account_id."""
    memberships = identity.data.get("business_memberships") or []
    ranked: list[tuple[int, str, int | None, str | None]] = []
    for membership in memberships:
        if not isinstance(membership, dict):
            continue
        role = str(membership.get("role") or "").lower()
        business = membership.get("business") or {}
        if not isinstance(business, dict):
            continue
        account_id = business.get("account_id")
        if not account_id:
            continue
        business_id = business.get("id")
        name = business.get("name")
        rank = 0 if role in ("owner", "admin") else 1 if role == "business_partner" else 2
        ranked.append((rank, str(account_id), int(business_id) if business_id is not None else None, name))
    if not ranked:
        return None, None, None
    ranked.sort(key=lambda row: row[0])
    _, account_id, business_id, name = ranked[0]
    return account_id, business_id, name


def _upsert_connection(
    db: Session,
    user: Profile,
    *,
    account_id: str,
    business_id: int | None,
    business_name: str | None,
    access_token: str,
    refresh_token: str,
    expires_at: datetime | None,
) -> Profile:
    now = datetime.now(UTC)
    expires_at = _normalize_expires_at(expires_at)

    connection = (
        db.query(FreshBooksConnection)
        .filter(FreshBooksConnection.user_id == user.id)
        .one_or_none()
    )
    if connection is None:
        connection = FreshBooksConnection(
            user_id=user.id,
            account_id=account_id,
            business_id=business_id,
            business_name=business_name,
            access_token_enc=encrypt_token(access_token),
            refresh_token_enc=encrypt_token(refresh_token),
            token_expires_at=expires_at,
            connected_at=now,
            disconnected_at=None,
        )
        db.add(connection)
    else:
        connection.account_id = account_id
        connection.business_id = business_id
        connection.business_name = business_name
        connection.access_token_enc = encrypt_token(access_token)
        connection.refresh_token_enc = encrypt_token(refresh_token)
        connection.token_expires_at = expires_at
        connection.connected_at = now
        connection.disconnected_at = None

    if user.onboarding_step in ("invoice_import", "quickbooks", "account", "persona"):
        user.onboarding_step = "invoice_import"
    db.commit()
    db.refresh(user)
    db.refresh(connection)
    return user

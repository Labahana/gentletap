from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import QuickBooksConnection
from gentletap.integrations.quickbooks.oauth import refresh_connection_tokens
from gentletap.utils.crypto import decrypt_token

SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com"
PRODUCTION_BASE = "https://quickbooks.api.intuit.com"


def _api_base(settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    if cfg.intuit_environment == "production":
        return PRODUCTION_BASE
    return SANDBOX_BASE


def _ensure_fresh_token(db: Session, connection: QuickBooksConnection) -> str:
    if connection.token_expires_at:
        expires = connection.token_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= datetime.now(UTC) + timedelta(minutes=5):
            refresh_connection_tokens(db, connection)
    return decrypt_token(connection.access_token_enc)


def query(
    db: Session,
    connection: QuickBooksConnection,
    sql: str,
    *,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    cfg = settings or get_settings()
    access_token = _ensure_fresh_token(db, connection)
    url = f"{_api_base(cfg)}/v3/company/{connection.realm_id}/query"
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }

    with httpx.Client(timeout=60.0) as client:
        response = client.get(url, params={"query": sql, "minorversion": "73"}, headers=headers)
        if response.status_code == 401:
            refresh_connection_tokens(db, connection)
            access_token = decrypt_token(connection.access_token_enc)
            headers["Authorization"] = f"Bearer {access_token}"
            response = client.get(url, params={"query": sql, "minorversion": "73"}, headers=headers)
        response.raise_for_status()
        payload = response.json()

    query_response = payload.get("QueryResponse", {})
    for key in ("Invoice", "Customer"):
        if key in query_response:
            items = query_response[key]
            return items if isinstance(items, list) else [items]
    return []


def get_customer(
    db: Session,
    connection: QuickBooksConnection,
    customer_id: str,
    *,
    settings: Settings | None = None,
) -> dict[str, Any] | None:
    rows = query(
        db,
        connection,
        f"SELECT * FROM Customer WHERE Id = '{customer_id}'",
        settings=settings,
    )
    return rows[0] if rows else None

from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import QuickBooksConnection
from gentletap.http_client import get_http_client
from gentletap.integrations.quickbooks.oauth import refresh_connection_tokens
from gentletap.utils.crypto import decrypt_token

SANDBOX_BASE = "https://sandbox-quickbooks.api.intuit.com"
PRODUCTION_BASE = "https://quickbooks.api.intuit.com"
QB_PAGE_SIZE = 1000


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


def _parse_query_response(payload: dict[str, Any]) -> list[dict[str, Any]]:
    query_response = payload.get("QueryResponse", {})
    for key in ("Invoice", "Customer", "Payment", "CreditMemo", "Estimate"):
        if key in query_response:
            items = query_response[key]
            return items if isinstance(items, list) else [items]
    return []


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
    client = get_http_client()
    response = client.get(url, params={"query": sql, "minorversion": "73"}, headers=headers)
    if response.status_code == 401:
        refresh_connection_tokens(db, connection)
        access_token = decrypt_token(connection.access_token_enc)
        headers["Authorization"] = f"Bearer {access_token}"
        response = client.get(url, params={"query": sql, "minorversion": "73"}, headers=headers)
    response.raise_for_status()
    return _parse_query_response(response.json())


def query_all(
    db: Session,
    connection: QuickBooksConnection,
    base_sql: str,
    *,
    settings: Settings | None = None,
    page_size: int = QB_PAGE_SIZE,
) -> list[dict[str, Any]]:
    """Paginate QB SQL queries — Intuit returns at most 1000 rows per page."""
    all_rows: list[dict[str, Any]] = []
    start = 1
    while True:
        sql = f"{base_sql} STARTPOSITION {start} MAXRESULTS {page_size}"
        batch = query(db, connection, sql, settings=settings)
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < page_size:
            break
        start += page_size
    return all_rows


def _safe_qb_id(entity_id: str) -> str | None:
    value = str(entity_id).strip()
    return value if value.isdigit() else None


def get_customer(
    db: Session,
    connection: QuickBooksConnection,
    customer_id: str,
    *,
    settings: Settings | None = None,
) -> dict[str, Any] | None:
    safe_id = _safe_qb_id(customer_id)
    if not safe_id:
        return None
    rows = query(
        db,
        connection,
        f"SELECT * FROM Customer WHERE Id = '{safe_id}'",
        settings=settings,
    )
    return rows[0] if rows else None

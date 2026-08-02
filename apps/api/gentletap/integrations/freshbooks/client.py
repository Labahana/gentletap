"""FreshBooks API client wrapper around the official SDK."""

from datetime import UTC, datetime, timedelta
from typing import Any, Iterator

from freshbooks import Client as FreshBooksSDK
from freshbooks import FilterBuilder, FreshBooksError, PaginateBuilder
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import FreshBooksConnection
from gentletap.integrations.freshbooks.oauth import _sdk_client, refresh_connection_tokens
from gentletap.utils.crypto import decrypt_token

PAGE_SIZE = 100


def _ensure_fresh_token(db: Session, connection: FreshBooksConnection) -> None:
    if connection.token_expires_at:
        expires = connection.token_expires_at
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=UTC)
        if expires <= datetime.now(UTC) + timedelta(minutes=5):
            refresh_connection_tokens(db, connection)


def get_sdk(
    db: Session,
    connection: FreshBooksConnection,
    *,
    settings: Settings | None = None,
) -> FreshBooksSDK:
    _ensure_fresh_token(db, connection)
    return _sdk_client(
        access_token=decrypt_token(connection.access_token_enc),
        refresh_token=decrypt_token(connection.refresh_token_enc),
        settings=settings or get_settings(),
    )


def _retry_on_auth(
    db: Session,
    connection: FreshBooksConnection,
    fn,
    *,
    settings: Settings | None = None,
):
    client = get_sdk(db, connection, settings=settings)
    try:
        return fn(client)
    except FreshBooksError as exc:
        if exc.status_code != 401:
            raise
        refresh_connection_tokens(db, connection, settings=settings)
        client = get_sdk(db, connection, settings=settings)
        return fn(client)


def list_outstanding_invoices(
    db: Session,
    connection: FreshBooksConnection,
    *,
    settings: Settings | None = None,
) -> list[Any]:
    """Paginate unpaid/outstanding invoices for the connected account."""

    def _fetch(client: FreshBooksSDK) -> list[Any]:
        results: list[Any] = []
        page = 1
        while True:
            builders = [
                FilterBuilder().equals("outstanding", True),
                PaginateBuilder(page, PAGE_SIZE),
            ]
            batch = client.invoices.list(connection.account_id, builders=builders)
            results.extend(list(batch))
            pages = getattr(batch, "pages", None)
            if pages is None or page >= pages.pages or len(batch) == 0:
                break
            page += 1
        return results

    return _retry_on_auth(db, connection, _fetch, settings=settings)


def get_invoice(
    db: Session,
    connection: FreshBooksConnection,
    invoice_id: int | str,
    *,
    settings: Settings | None = None,
) -> Any | None:
    def _fetch(client: FreshBooksSDK):
        return client.invoices.get(connection.account_id, int(invoice_id))

    try:
        return _retry_on_auth(db, connection, _fetch, settings=settings)
    except FreshBooksError as exc:
        if exc.status_code == 404:
            return None
        raise


def get_client(
    db: Session,
    connection: FreshBooksConnection,
    client_id: int | str,
    *,
    settings: Settings | None = None,
) -> Any | None:
    def _fetch(client: FreshBooksSDK):
        return client.clients.get(connection.account_id, int(client_id))

    try:
        return _retry_on_auth(db, connection, _fetch, settings=settings)
    except FreshBooksError as exc:
        if exc.status_code == 404:
            return None
        raise


def get_payment(
    db: Session,
    connection: FreshBooksConnection,
    payment_id: int | str,
    *,
    settings: Settings | None = None,
) -> Any | None:
    def _fetch(client: FreshBooksSDK):
        return client.payments.get(connection.account_id, int(payment_id))

    try:
        return _retry_on_auth(db, connection, _fetch, settings=settings)
    except FreshBooksError as exc:
        if exc.status_code == 404:
            return None
        raise


def register_webhooks(
    db: Session,
    connection: FreshBooksConnection,
    callback_uri: str,
    *,
    settings: Settings | None = None,
) -> list[dict[str, Any]]:
    """Register invoice + payment + client webhook callbacks. Returns created callback metadata."""
    events = ("invoice", "payment", "client")
    created: list[dict[str, Any]] = []

    def _create(client: FreshBooksSDK, event: str):
        return client.callbacks.create(
            connection.account_id,
            {"event": event, "uri": callback_uri},
        )

    for event in events:
        try:
            result = _retry_on_auth(
                db,
                connection,
                lambda c, ev=event: _create(c, ev),
                settings=settings,
            )
            created.append(
                {
                    "event": event,
                    "callback_id": result.data.get("callbackid") or result.data.get("id"),
                    "verified": bool(result.data.get("verified")),
                }
            )
        except FreshBooksError:
            # Duplicate URI/event or scope gaps — sync still works via polling.
            continue
    return created


def verify_webhook_callback(
    db: Session,
    connection: FreshBooksConnection,
    callback_id: int,
    verifier: str,
    *,
    settings: Settings | None = None,
) -> None:
    def _verify(client: FreshBooksSDK):
        return client.callbacks.verify(connection.account_id, callback_id, verifier)

    _retry_on_auth(db, connection, _verify, settings=settings)


def iter_pages(total_pages: int) -> Iterator[int]:
    yield from range(1, max(total_pages, 1) + 1)

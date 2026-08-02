"""Sync outstanding FreshBooks invoices into GentleTap."""

from datetime import UTC, date, datetime
from decimal import Decimal
from time import perf_counter
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Client, FreshBooksConnection, Invoice, SyncLog
from gentletap.integrations.freshbooks import client as fb_client
from gentletap.integrations.freshbooks.ids import to_external_client_id, to_external_invoice_id
from gentletap.integrations.quickbooks.sync import _invoice_status, _parse_date
from gentletap.scale_limits import QB_SYNC_REDIS_EVERY_N
from gentletap.services.sequences import reopen_invoice
from gentletap.utils.redis_client import set_json


def sync_status_key(user_id: UUID) -> str:
    return f"fb_sync:{user_id}"


def _update_sync_status(user_id: UUID, **fields) -> None:
    set_json(sync_status_key(user_id), fields, ttl_seconds=86400)


def _money_amount(value) -> Decimal:
    if value is None:
        return Decimal("0")
    if hasattr(value, "data") and isinstance(value.data, dict):
        raw = value.data.get("amount", 0)
        return Decimal(str(raw or 0))
    if isinstance(value, dict):
        return Decimal(str(value.get("amount", 0) or 0))
    return Decimal(str(value or 0))


def _money_currency(value, default: str = "USD") -> str:
    if value is None:
        return default
    if hasattr(value, "data") and isinstance(value.data, dict):
        return str(value.data.get("code") or default)
    if isinstance(value, dict):
        return str(value.get("code") or default)
    return default


def _client_display_name(fb_client_obj) -> str:
    org = getattr(fb_client_obj, "organization", None) or ""
    fname = getattr(fb_client_obj, "fname", None) or ""
    lname = getattr(fb_client_obj, "lname", None) or ""
    name = org.strip() or f"{fname} {lname}".strip()
    return name or "Unknown"


def _as_date(value) -> date | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date()
    if isinstance(value, date):
        return value
    if isinstance(value, str):
        return _parse_date(value[:10] if len(value) >= 10 else value)
    return None


def sync_unpaid_invoices(db: Session, user_id: UUID) -> dict:
    started = perf_counter()
    connection = (
        db.query(FreshBooksConnection)
        .filter(
            FreshBooksConnection.user_id == user_id,
            FreshBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        _update_sync_status(
            user_id,
            status="error",
            progress=0,
            message="FreshBooks not connected",
            unpaid_count=0,
            total_outstanding=0.0,
        )
        return {"status": "error", "message": "FreshBooks not connected"}

    _update_sync_status(
        user_id,
        status="syncing",
        progress=10,
        message="Fetching outstanding invoices from FreshBooks…",
        unpaid_count=0,
        total_outstanding=0.0,
    )

    try:
        fb_invoices = fb_client.list_outstanding_invoices(db, connection)
        _update_sync_status(
            user_id,
            status="syncing",
            progress=40,
            message=f"Processing {len(fb_invoices)} invoices…",
            unpaid_count=len(fb_invoices),
            total_outstanding=0.0,
        )

        customer_cache: dict[str, Client] = {}
        total_outstanding = Decimal("0")
        synced = 0
        synced_external_ids: set[str] = set()

        for inv in fb_invoices:
            customer_id = getattr(inv, "customerid", None)
            invoice_id = getattr(inv, "invoiceid", None) or getattr(inv, "id", None)
            if customer_id is None or invoice_id is None:
                continue

            # Skip pure drafts that aren't client-visible yet.
            v3 = str(getattr(inv, "v3_status", "") or "").lower()
            status_code = getattr(inv, "status", None)
            if v3 == "draft" or status_code == 1:
                continue

            external_client_id = to_external_client_id(customer_id)
            external_invoice_id = to_external_invoice_id(invoice_id)
            synced_external_ids.add(external_invoice_id)

            client_row = customer_cache.get(external_client_id)
            if client_row is None:
                client_row = (
                    db.query(Client)
                    .filter(Client.user_id == user_id, Client.qb_customer_id == external_client_id)
                    .one_or_none()
                )
                if client_row is None:
                    fb_customer = fb_client.get_client(db, connection, customer_id)
                    if fb_customer is None:
                        name = "Unknown"
                        email = None
                        phone = None
                    else:
                        name = _client_display_name(fb_customer)
                        email = getattr(fb_customer, "email", None)
                        phone = getattr(fb_customer, "bus_phone", None) or getattr(
                            fb_customer, "home_phone", None
                        )
                    client_row = Client(
                        user_id=user_id,
                        qb_customer_id=external_client_id,
                        name=name,
                        email=email,
                        phone=phone,
                    )
                    db.add(client_row)
                    db.flush()
                else:
                    if not client_row.email or client_row.name in ("Unknown", ""):
                        fb_customer = fb_client.get_client(db, connection, customer_id)
                        if fb_customer is not None:
                            client_row.email = getattr(fb_customer, "email", None) or client_row.email
                            client_row.name = _client_display_name(fb_customer) or client_row.name
                            client_row.phone = (
                                getattr(fb_customer, "bus_phone", None)
                                or getattr(fb_customer, "home_phone", None)
                                or client_row.phone
                            )
                customer_cache[external_client_id] = client_row

            balance = _money_amount(getattr(inv, "outstanding", None))
            amount = _money_amount(getattr(inv, "amount", None)) or balance
            currency = _money_currency(getattr(inv, "amount", None))
            due_date = _as_date(getattr(inv, "due_date", None))
            invoice_date = _as_date(getattr(inv, "create_date", None))
            days_overdue, status = _invoice_status(due_date, balance)
            if v3 == "disputed":
                # Keep traffic-light from balance/due; dispute flag set below.
                pass
            total_outstanding += balance

            updated = getattr(inv, "updated", None)
            qb_last_updated = None
            if isinstance(updated, datetime):
                qb_last_updated = updated if updated.tzinfo else updated.replace(tzinfo=UTC)

            invoice_row = (
                db.query(Invoice)
                .filter(Invoice.user_id == user_id, Invoice.qb_invoice_id == external_invoice_id)
                .one_or_none()
            )
            doc_number = getattr(inv, "invoice_number", None)

            if invoice_row is None:
                invoice_row = Invoice(
                    user_id=user_id,
                    client_id=client_row.id,
                    qb_invoice_id=external_invoice_id,
                    doc_number=str(doc_number) if doc_number is not None else None,
                    amount=amount,
                    balance=balance,
                    currency=currency,
                    invoice_date=invoice_date,
                    due_date=due_date,
                    days_overdue=days_overdue,
                    status=status,
                    source="freshbooks",
                    qb_last_updated=qb_last_updated,
                    dispute_flag=(v3 == "disputed"),
                )
                db.add(invoice_row)
            else:
                invoice_row.client_id = client_row.id
                invoice_row.doc_number = str(doc_number) if doc_number is not None else invoice_row.doc_number
                invoice_row.amount = amount
                invoice_row.balance = balance
                invoice_row.currency = currency
                invoice_row.invoice_date = invoice_date
                invoice_row.due_date = due_date
                invoice_row.days_overdue = days_overdue
                invoice_row.status = status
                invoice_row.source = "freshbooks"
                invoice_row.qb_last_updated = qb_last_updated
                invoice_row.dispute_flag = v3 == "disputed" or bool(invoice_row.dispute_flag)
                reopen_invoice(invoice_row)

            synced += 1
            if synced == 1 or synced % QB_SYNC_REDIS_EVERY_N == 0 or synced == len(fb_invoices):
                progress = 40 + int((synced / max(len(fb_invoices), 1)) * 50)
                _update_sync_status(
                    user_id,
                    status="syncing",
                    progress=progress,
                    message=f"Synced {synced} of {len(fb_invoices)} invoices…",
                    unpaid_count=len(fb_invoices),
                    total_outstanding=float(total_outstanding),
                )

        connection.last_sync_at = datetime.now(UTC)
        db.commit()

        from gentletap.tasks.profiler import reprofile_user_clients

        reprofile_user_clients.delay(str(user_id))

        from gentletap.services.payments import apply_invoice_balance_update

        stale_q = db.query(Invoice).filter(
            Invoice.user_id == user_id,
            Invoice.balance > 0,
            Invoice.source == "freshbooks",
        )
        if synced_external_ids:
            stale_q = stale_q.filter(Invoice.qb_invoice_id.notin_(synced_external_ids))
        for inv_row in stale_q.all():
            apply_invoice_balance_update(
                db,
                user_id=user_id,
                qb_invoice_id=inv_row.qb_invoice_id,
                balance=Decimal("0"),
                notify=True,
            )

        from gentletap.database import Profile
        from gentletap.services.reminders import auto_activate_new_invoices

        user = db.query(Profile).filter(Profile.id == user_id).one_or_none()
        auto_activated = 0
        if user:
            auto_activated = auto_activate_new_invoices(db, user)

        result = {
            "status": "complete",
            "progress": 100,
            "message": f"Imported {synced} outstanding invoices",
            "unpaid_count": synced,
            "total_outstanding": float(total_outstanding),
            "auto_activated": auto_activated,
        }
        _update_sync_status(user_id, **result)
        _log_sync(db, user_id, "complete", result["message"], synced, started)
        return result

    except Exception as exc:
        db.rollback()
        result = {
            "status": "error",
            "progress": 0,
            "message": str(exc),
            "unpaid_count": 0,
            "total_outstanding": 0.0,
        }
        _update_sync_status(user_id, **result)
        _log_sync(db, user_id, "error", str(exc), 0, started)
        return result


def _log_sync(
    db: Session,
    user_id: UUID,
    status: str,
    message: str | None,
    invoices_synced: int,
    started: float,
) -> None:
    duration_ms = int((perf_counter() - started) * 1000)
    db.add(
        SyncLog(
            user_id=user_id,
            source="freshbooks",
            status=status,
            message=message,
            invoices_synced=invoices_synced,
            duration_ms=duration_ms,
        )
    )
    db.commit()

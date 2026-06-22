from datetime import UTC, date, datetime
from decimal import Decimal
from time import perf_counter
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, QuickBooksConnection, SyncLog
from gentletap.integrations.quickbooks import client as qb_client
from gentletap.integrations.quickbooks.invoice_fields import payment_link_from_qb
from gentletap.utils.redis_client import set_json


def sync_status_key(user_id: UUID) -> str:
    return f"qb_sync:{user_id}"


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value)


def _invoice_status(due_date: date | None, balance: Decimal) -> tuple[int, str]:
    if balance <= 0:
        return 0, "paid"
    if due_date is None:
        return 0, "yellow"
    days_overdue = (date.today() - due_date).days
    if days_overdue <= 0:
        return max(days_overdue, 0), "green"
    if days_overdue <= 7:
        return days_overdue, "yellow"
    return days_overdue, "red"


def _update_sync_status(user_id: UUID, **fields) -> None:
    set_json(sync_status_key(user_id), fields)


def sync_unpaid_invoices(db: Session, user_id: UUID) -> dict:
    started = perf_counter()
    connection = (
        db.query(QuickBooksConnection)
        .filter(
            QuickBooksConnection.user_id == user_id,
            QuickBooksConnection.disconnected_at.is_(None),
        )
        .one_or_none()
    )
    if connection is None:
        _update_sync_status(
            user_id,
            status="error",
            progress=0,
            message="QuickBooks not connected",
            unpaid_count=0,
            total_outstanding=0.0,
        )
        return {"status": "error", "message": "QuickBooks not connected"}

    _update_sync_status(
        user_id,
        status="syncing",
        progress=10,
        message="Fetching unpaid invoices from QuickBooks…",
        unpaid_count=0,
        total_outstanding=0.0,
    )

    try:
        qb_invoices = qb_client.query(
            db,
            connection,
            "SELECT * FROM Invoice WHERE Balance > '0'",
        )
        _update_sync_status(
            user_id,
            status="syncing",
            progress=40,
            message=f"Processing {len(qb_invoices)} invoices…",
            unpaid_count=len(qb_invoices),
            total_outstanding=0.0,
        )

        customer_cache: dict[str, Client] = {}
        total_outstanding = Decimal("0")
        synced = 0

        for qb_invoice in qb_invoices:
            customer_ref = qb_invoice.get("CustomerRef", {})
            qb_customer_id = str(customer_ref.get("value", ""))
            if not qb_customer_id:
                continue

            client_row = customer_cache.get(qb_customer_id)
            if client_row is None:
                client_row = (
                    db.query(Client)
                    .filter(Client.user_id == user_id, Client.qb_customer_id == qb_customer_id)
                    .one_or_none()
                )
                if client_row is None:
                    qb_customer = qb_client.get_customer(db, connection, qb_customer_id)
                    name = qb_customer.get("DisplayName", customer_ref.get("name", "Unknown")) if qb_customer else customer_ref.get("name", "Unknown")
                    email = None
                    phone = None
                    if qb_customer:
                        email = qb_customer.get("PrimaryEmailAddr", {}).get("Address")
                        phone = qb_customer.get("PrimaryPhone", {}).get("FreeFormNumber")
                    client_row = Client(
                        user_id=user_id,
                        qb_customer_id=qb_customer_id,
                        name=name,
                        email=email,
                        phone=phone,
                    )
                    db.add(client_row)
                    db.flush()
                else:
                    qb_customer = qb_client.get_customer(db, connection, qb_customer_id)
                    if qb_customer:
                        client_row.email = qb_customer.get("PrimaryEmailAddr", {}).get("Address") or client_row.email
                        client_row.phone = qb_customer.get("PrimaryPhone", {}).get("FreeFormNumber") or client_row.phone
                        client_row.name = qb_customer.get("DisplayName", client_row.name)
                customer_cache[qb_customer_id] = client_row

            balance = Decimal(str(qb_invoice.get("Balance", 0)))
            amount = Decimal(str(qb_invoice.get("TotalAmt", balance)))
            due_date = _parse_date(qb_invoice.get("DueDate"))
            invoice_date = _parse_date(qb_invoice.get("TxnDate"))
            days_overdue, status = _invoice_status(due_date, balance)
            total_outstanding += balance

            qb_invoice_id = str(qb_invoice["Id"])
            invoice_row = (
                db.query(Invoice)
                .filter(Invoice.user_id == user_id, Invoice.qb_invoice_id == qb_invoice_id)
                .one_or_none()
            )
            meta = qb_invoice.get("MetaData", {})
            qb_last_updated = None
            if meta.get("LastUpdatedTime"):
                qb_last_updated = datetime.fromisoformat(meta["LastUpdatedTime"].replace("Z", "+00:00"))
            payment_link = payment_link_from_qb(qb_invoice)

            if invoice_row is None:
                invoice_row = Invoice(
                    user_id=user_id,
                    client_id=client_row.id,
                    qb_invoice_id=qb_invoice_id,
                    doc_number=qb_invoice.get("DocNumber"),
                    amount=amount,
                    balance=balance,
                    currency=qb_invoice.get("CurrencyRef", {}).get("value", "USD"),
                    invoice_date=invoice_date,
                    due_date=due_date,
                    days_overdue=days_overdue,
                    status=status,
                    payment_link=payment_link,
                    qb_last_updated=qb_last_updated,
                )
                db.add(invoice_row)
            else:
                invoice_row.client_id = client_row.id
                invoice_row.doc_number = qb_invoice.get("DocNumber")
                invoice_row.amount = amount
                invoice_row.balance = balance
                invoice_row.invoice_date = invoice_date
                invoice_row.due_date = due_date
                invoice_row.days_overdue = days_overdue
                invoice_row.status = status
                invoice_row.payment_link = payment_link
                invoice_row.qb_last_updated = qb_last_updated

            synced += 1
            progress = 40 + int((synced / max(len(qb_invoices), 1)) * 50)
            _update_sync_status(
                user_id,
                status="syncing",
                progress=progress,
                message=f"Synced {synced} of {len(qb_invoices)} invoices…",
                unpaid_count=len(qb_invoices),
                total_outstanding=float(total_outstanding),
            )

        connection.last_sync_at = datetime.now(UTC)
        db.commit()

        from gentletap.intelligence.profiler import reprofile_user_clients

        reprofile_user_clients(db, user_id)

        # Mark invoices paid if no longer returned by QB unpaid query
        from decimal import Decimal as D

        from gentletap.services.payments import apply_invoice_balance_update

        synced_qb_ids = {str(qb.get("Id")) for qb in qb_invoices}
        stale_q = db.query(Invoice).filter(Invoice.user_id == user_id, Invoice.balance > 0)
        if synced_qb_ids:
            stale_q = stale_q.filter(Invoice.qb_invoice_id.notin_(synced_qb_ids))
        for inv in stale_q.all():
            apply_invoice_balance_update(
                db,
                user_id=user_id,
                qb_invoice_id=inv.qb_invoice_id,
                balance=D("0"),
                notify=True,
            )

        # Auto-activate new overdue invoices for users who have completed onboarding.
        from gentletap.database import Profile
        from gentletap.services.reminders import auto_activate_new_invoices

        user = db.query(Profile).filter(Profile.id == user_id).one_or_none()
        auto_activated = 0
        if user:
            auto_activated = auto_activate_new_invoices(db, user)

        result = {
            "status": "complete",
            "progress": 100,
            "message": f"Imported {len(qb_invoices)} unpaid invoices",
            "unpaid_count": len(qb_invoices),
            "total_outstanding": float(total_outstanding),
            "auto_activated": auto_activated,
        }
        _update_sync_status(user_id, **result)
        _log_sync(db, user_id, "complete", result["message"], len(qb_invoices), started)
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
            source="quickbooks",
            status=status,
            message=message,
            invoices_synced=invoices_synced,
            duration_ms=duration_ms,
        )
    )
    db.commit()

"""Manual updates for spreadsheet-uploaded invoices."""

from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from gentletap.database import Invoice, Profile, UserNotification
from gentletap.integrations.quickbooks.sync import _invoice_status
from gentletap.services.invoice_source import invoice_source
from gentletap.services.sequences import mark_invoice_paid, recalculate_invoice_status


def require_upload_invoice(inv: Invoice) -> None:
    if invoice_source(inv) != "upload":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only uploaded invoices can be updated manually — QuickBooks invoices sync automatically",
        )


def mark_upload_invoice_paid(
    db: Session,
    inv: Invoice,
    *,
    user_id,
    notify: bool = True,
    commit: bool = True,
) -> Invoice:
    require_upload_invoice(inv)
    if float(inv.balance) <= 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invoice is already paid")

    was_unpaid = float(inv.balance) > 0
    mark_invoice_paid(db, inv)
    inv.last_manual_update_at = datetime.now(UTC)

    if notify and was_unpaid:
        user = db.query(Profile).filter(Profile.id == user_id).one()
        client_name = inv.client.name if inv.client else "Your client"
        db.add(
            UserNotification(
                user_id=user.id,
                kind="payment_received",
                title="Invoice marked paid",
                body=f"You marked invoice #{inv.doc_number or inv.qb_invoice_id} for {client_name} as paid.",
                invoice_id=inv.id,
            )
        )

    if commit:
        db.commit()
        db.refresh(inv)
    return inv


def bulk_mark_upload_invoices_paid(db: Session, user_id: UUID, invoice_ids: list[UUID]) -> dict:
    paid: list[str] = []
    errors: list[dict] = []
    for invoice_id in invoice_ids:
        inv = (
            db.query(Invoice)
            .filter(Invoice.id == invoice_id, Invoice.user_id == user_id)
            .one_or_none()
        )
        if inv is None:
            errors.append({"invoice_id": str(invoice_id), "error": "not_found"})
            continue
        try:
            mark_upload_invoice_paid(db, inv, user_id=user_id, notify=False, commit=False)
            paid.append(str(invoice_id))
        except HTTPException as exc:
            errors.append({"invoice_id": str(invoice_id), "error": exc.detail})
    if paid:
        user = db.query(Profile).filter(Profile.id == user_id).one()
        db.add(
            UserNotification(
                user_id=user.id,
                kind="payment_received",
                title=f"{len(paid)} invoice{'s' if len(paid) != 1 else ''} marked paid",
                body="Uploaded invoices were marked as paid. Reminders have stopped.",
            )
        )
    db.commit()
    return {"paid_count": len(paid), "paid": paid, "errors": errors}


def update_upload_invoice(
    db: Session,
    inv: Invoice,
    *,
    balance: Decimal | None = None,
    due_date: date | None = None,
    payment_link: str | None = None,
    clear_payment_link: bool = False,
) -> Invoice:
    require_upload_invoice(inv)

    if balance is not None:
        if balance < 0:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Balance cannot be negative")
        inv.balance = balance
        if balance > inv.amount:
            inv.amount = balance

    if due_date is not None:
        inv.due_date = due_date

    if clear_payment_link:
        inv.payment_link = None
    elif payment_link is not None:
        link = payment_link.strip()
        if link and not link.lower().startswith(("http://", "https://")):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Payment link must be a valid URL")
        inv.payment_link = link[:2048] if link else None

    if balance is not None or due_date is not None:
        days_overdue, status_value = _invoice_status(inv.due_date, Decimal(str(inv.balance)))
        inv.days_overdue = days_overdue
        inv.status = status_value
        recalculate_invoice_status(inv)
        if float(inv.balance) <= 0:
            mark_invoice_paid(db, inv)

    inv.last_manual_update_at = datetime.now(UTC)
    db.commit()
    db.refresh(inv)
    return inv

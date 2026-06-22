"""Payment detection when QuickBooks balance hits zero."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Invoice, Profile, UserNotification
from gentletap.services.sequences import mark_invoice_paid, recalculate_invoice_status


def apply_invoice_balance_update(
    db: Session,
    *,
    user_id: UUID,
    qb_invoice_id: str,
    balance: Decimal,
    notify: bool = True,
    payment_link: str | None = None,
    sync_payment_link: bool = False,
) -> Invoice | None:
    invoice = (
        db.query(Invoice)
        .filter(Invoice.user_id == user_id, Invoice.qb_invoice_id == qb_invoice_id)
        .one_or_none()
    )
    if invoice is None:
        return None

    was_unpaid = float(invoice.balance) > 0
    invoice.balance = balance
    if sync_payment_link:
        invoice.payment_link = payment_link
    recalculate_invoice_status(invoice)

    if balance <= 0 and was_unpaid:
        mark_invoice_paid(db, invoice)
        if notify:
            user = db.query(Profile).filter(Profile.id == user_id).one()
            client_name = invoice.client.name if invoice.client else "Your client"
            db.add(
                UserNotification(
                    user_id=user.id,
                    kind="payment_received",
                    title="Payment received!",
                    body=f"{client_name} paid invoice #{invoice.doc_number or invoice.qb_invoice_id}.",
                    invoice_id=invoice.id,
                )
            )
    db.commit()
    db.refresh(invoice)
    return invoice


def reconcile_zero_balance_invoices(db: Session, user_id: UUID) -> int:
    """Mark local invoices paid if QB sync removed them from unpaid set."""
    from gentletap.integrations.quickbooks.sync import sync_unpaid_invoices

    sync_unpaid_invoices(db, user_id)
    return 0

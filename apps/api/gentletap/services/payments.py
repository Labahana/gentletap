"""Payment detection when QuickBooks balance hits zero."""

from datetime import UTC, datetime
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Invoice, Profile, UserNotification
from gentletap.services.payment_notifications import send_qb_payment_received_email
from gentletap.services.sequences import mark_invoice_paid, recalculate_invoice_status, reopen_invoice


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
    collected_amount = float(invoice.balance)
    invoice.balance = balance
    if sync_payment_link:
        invoice.payment_link = payment_link
    recalculate_invoice_status(invoice)

    # Reopen a previously-paid invoice that now carries a balance again.
    if balance > 0 and not was_unpaid:
        reopen_invoice(invoice)

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
            send_qb_payment_received_email(db, user, invoice, amount=collected_amount)
    db.commit()
    db.refresh(invoice)
    return invoice

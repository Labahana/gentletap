"""Payment detection and auto-stop of reminder sequences."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.invoice import Invoice
from app.models.org_settings import OrgSettings
from app.models.payout import Payout
from app.services.client_profile import recompute_client_profile
from app.services.reminder_engine import cancel_pending_reminders, get_or_create_org_settings

logger = logging.getLogger(__name__)


def auto_stop_on_payment(
    db: Session,
    invoice: Invoice,
    *,
    method: str = "detected",
    actor_type: str = "system",
    actor_id: Optional[str] = None,
    send_thank_you: Optional[bool] = None,
) -> dict:
    """
    Mark invoice paid, cancel pending reminders, optionally enqueue thank-you.
    Idempotent if already paid.
    """
    now = datetime.now(timezone.utc)
    already_paid = invoice.status == "paid" and float(invoice.balance or 0) == 0

    invoice.status = "paid"
    invoice.balance = 0.0
    invoice.paid_at = invoice.paid_at or now
    invoice.stop_reminders = True

    cancelled = cancel_pending_reminders(db, invoice.id, reason="payment_detected")

    if not already_paid:
        existing_payout = db.query(Payout).filter(Payout.invoice_id == invoice.id).first()
        if not existing_payout:
            db.add(
                Payout(
                    org_id=invoice.org_id,
                    invoice_id=invoice.id,
                    amount=invoice.amount,
                    currency=invoice.currency,
                    paid_at=now,
                    method=method,
                )
            )

    org_settings = get_or_create_org_settings(db, invoice.org_id)
    thank_you = send_thank_you if send_thank_you is not None else org_settings.send_thank_you

    db.add(
        AuditLog(
            org_id=invoice.org_id,
            actor_type=actor_type,
            actor_id=actor_id,
            action="auto_stop_reminders",
            entity_type="invoice",
            entity_id=invoice.id,
            details={
                "cancelled_count": cancelled,
                "method": method,
                "thank_you": bool(thank_you),
            },
        )
    )

    try:
        recompute_client_profile(db, invoice.client_id, invoice.org_id)
    except Exception as exc:
        logger.warning("Profile recompute failed for client %s: %s", invoice.client_id, exc)

    db.flush()
    return {
        "invoice_id": invoice.id,
        "cancelled_count": cancelled,
        "thank_you": bool(thank_you),
        "already_paid": already_paid,
    }


def detect_and_stop_if_paid(db: Session, invoice: Invoice, method: str = "sync") -> Optional[dict]:
    """If balance is zero or status indicates paid, run auto-stop."""
    balance = float(invoice.balance or 0)
    if balance <= 0 or invoice.status == "paid":
        return auto_stop_on_payment(db, invoice, method=method)
    return None

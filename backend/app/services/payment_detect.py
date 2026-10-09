"""Payment detection and auto-stop of reminder sequences."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from sqlalchemy.orm import Session

from app.models.audit_log import AuditLog
from app.models.connection import Connection
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
    if invoice.status == "paid" and balance <= 0:
        # Already settled: nothing to cancel and no payout to record. Re-running the
        # transition would just write an AuditLog per poll (sync runs every 30 min).
        return None
    if balance <= 0 or invoice.status == "paid":
        return auto_stop_on_payment(db, invoice, method=method)
    return None


def refresh_invoice_from_provider(db: Session, invoice: Invoice, *, method: str = "provider_check") -> Optional[dict]:
    """Re-read one invoice straight from its accounting provider and reconcile it.

    The local paid predicate only knows what the last sync wrote, and webhook
    payloads carry no trustworthy balance — so a payment signal must be confirmed
    against the ledger before reminders stop. Returns None when there is no
    authoritative source for this invoice (CSV/manual, expired token, id gone),
    leaving the caller to fall back to the local predicate.
    """
    conn = _provider_connection(db, invoice)
    if conn is None or not invoice.external_id:
        return None
    # Deferred: both provider services import this module for the stop transition.
    if conn.provider == "quickbooks":
        from app.services.quickbooks import fetch_qbo_invoice_state as fetch
    elif conn.provider == "freshbooks":
        from app.services.freshbooks import fetch_freshbooks_invoice_state as fetch
    else:
        return None

    try:
        state = fetch(db, conn, invoice.external_id)
    except Exception as exc:  # noqa: BLE001 — a provider hiccup must not fail the caller
        db.rollback()
        logger.warning("Provider invoice read failed for %s: %s", invoice.id, exc)
        return None
    if state is None:
        return None

    balance = float(state.get("balance") or 0)
    amount = float(state.get("amount") or 0)
    invoice.balance = balance
    if amount:
        invoice.amount = amount
    if state.get("payment_link"):
        invoice.payment_link = state["payment_link"]
    db.flush()

    settled = balance <= 0 or state.get("status") == "paid"
    if settled:
        if invoice.status == "paid":
            return {"invoice_id": invoice.id, "already_paid": True}
        if state.get("paid_at"):
            invoice.paid_at = state["paid_at"]
        return auto_stop_on_payment(db, invoice, method=method)

    if invoice.status == "paid":
        # Reopened upstream (reversal / credit note): chase again and let the
        # autopilot reconciler revive the cancelled jobs.
        invoice.status = "unpaid"
        invoice.stop_reminders = False
        invoice.paid_at = None
        logger.info("Invoice %s reopened after provider re-check", invoice.id)
        return {"invoice_id": invoice.id, "reopened": True}

    return {"invoice_id": invoice.id, "checked": True}


def _provider_connection(db: Session, invoice: Invoice) -> Optional[Connection]:
    if invoice.connection_id:
        conn = db.query(Connection).filter(Connection.id == invoice.connection_id).first()
        if conn:
            return conn
    # Manually imported or connection-less rows: fall back to the org's live
    # connection matching where the invoice came from.
    if invoice.imported_from in ("quickbooks", "freshbooks"):
        return (
            db.query(Connection)
            .filter(
                Connection.org_id == invoice.org_id,
                Connection.provider == invoice.imported_from,
                Connection.status == "active",
            )
            .first()
        )
    return None

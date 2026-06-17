"""Resend webhook verification and delivery events."""

import logging
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Client, Invoice, ReminderMessage, UserNotification
from gentletap.services.sequences import cancel_invoice_jobs

logger = logging.getLogger(__name__)


def verify_signature(payload: bytes, headers: dict[str, str]) -> bool:
    secret = get_settings().resend_webhook_secret
    if not secret:
        return False

    normalized = {k.lower(): v for k, v in headers.items()}
    if normalized.get("svix-signature"):
        try:
            from svix.webhooks import Webhook

            Webhook(secret).verify(payload, normalized)
            return True
        except Exception:
            return False

    # Legacy header fallback (pre-Svix)
    import hashlib
    import hmac

    legacy_sig = normalized.get("resend-signature")
    if not legacy_sig:
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, legacy_sig)


def _recipient_emails(data: dict) -> list[str]:
    raw = data.get("to") or data.get("email") or []
    if isinstance(raw, str):
        return [raw.lower()]
    return [str(addr).lower() for addr in raw if addr]


def _suppress_client_email(db: Session, *, user_id, email: str, reason: str) -> None:
    q = db.query(Client).filter(Client.email.ilike(email))
    if user_id is not None:
        q = q.filter(Client.user_id == user_id)
    for client in q.all():
        if client.email_suppressed:
            continue
        client.email_suppressed = True
        active_invoices = (
            db.query(Invoice)
            .filter(
                Invoice.client_id == client.id,
                Invoice.sequence_active.is_(True),
            )
            .all()
        )
        for inv in active_invoices:
            cancel_invoice_jobs(db, inv.id)
        db.add(
            UserNotification(
                user_id=client.user_id,
                kind="email_deliverability",
                title=f"Email blocked for {client.name}",
                body=(
                    f"Reminders to {email} were stopped ({reason}). "
                    "Update the client email in QuickBooks or contact them another way."
                ),
            )
        )


def handle_webhook_event(db: Session, payload: dict) -> None:
    event_type = payload.get("type", "")
    data = payload.get("data", {})
    email_id = data.get("email_id") or data.get("id")

    message = None
    if email_id:
        message = (
            db.query(ReminderMessage)
            .filter(ReminderMessage.external_message_id == str(email_id))
            .one_or_none()
        )

    if event_type == "email.opened" and message:
        if message.opened_at is None:
            message.opened_at = datetime.now(UTC)
            db.commit()
        return

    if event_type in ("email.delivered", "email.sent") and message:
        if message.status != "sent":
            message.status = "sent"
            if message.sent_at is None:
                message.sent_at = datetime.now(UTC)
            db.commit()
        return

    if event_type == "email.bounced":
        bounce = data.get("bounce") or {}
        reason = bounce.get("message") or data.get("bounce_type") or "bounced"
        if message:
            message.status = "bounced"
            message.error_message = str(reason)[:500]
            invoice = db.query(Invoice).filter(Invoice.id == message.invoice_id).one_or_none()
            if invoice and invoice.client and invoice.client.email:
                _suppress_client_email(
                    db,
                    user_id=invoice.user_id,
                    email=invoice.client.email.lower(),
                    reason="hard bounce",
                )
            db.commit()
        else:
            logger.warning(
                "Resend bounce without matching reminder — skipping global suppression: %s",
                _recipient_emails(data),
            )
        return

    if event_type == "email.complained":
        if message:
            message.status = "complained"
            invoice = db.query(Invoice).filter(Invoice.id == message.invoice_id).one_or_none()
            if invoice and invoice.client and invoice.client.email:
                _suppress_client_email(
                    db,
                    user_id=invoice.user_id,
                    email=invoice.client.email.lower(),
                    reason="spam complaint",
                )
            db.commit()
        else:
            logger.warning(
                "Resend complaint without matching reminder — skipping global suppression: %s",
                _recipient_emails(data),
            )

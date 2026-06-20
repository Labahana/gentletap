"""Route inbound WhatsApp replies to the correct freelancer and invoice."""

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, ReminderMessage, UserNotification, WhatsappInboundMessage
from gentletap.integrations.twilio.phone import normalize_phone_e164, phones_match
from gentletap.services.payment_claims import is_payment_claim

logger = logging.getLogger(__name__)


def _apply_invoice_reply(
    db: Session,
    *,
    invoice: Invoice,
    client: Client,
    body: str,
) -> None:
    if is_payment_claim(body):
        invoice.client_claimed_paid_at = datetime.now(UTC)
        db.add(
            UserNotification(
                user_id=invoice.user_id,
                kind="whatsapp_payment_claim",
                title=f"Client claims paid — invoice #{invoice.doc_number or ''}".strip(),
                body=(
                    f"{client.name} says they paid. Reminders continue until QuickBooks confirms. "
                    f"Message: {body[:400]}"
                ),
                invoice_id=invoice.id,
            )
        )
        return

    invoice.client_responded_at = datetime.now(UTC)
    db.add(
        UserNotification(
            user_id=invoice.user_id,
            kind="whatsapp_reply",
            title=f"WhatsApp reply on invoice #{invoice.doc_number or ''}".strip(),
            body=body[:500],
            invoice_id=invoice.id,
        )
    )


def _find_recent_outbound(
    db: Session,
    *,
    client_phone: str,
    user_id: UUID | None,
) -> tuple[ReminderMessage, Invoice, Client] | None:
    since = datetime.now(UTC) - timedelta(days=45)
    q = (
        db.query(ReminderMessage, Invoice, Client)
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .join(Client, Invoice.client_id == Client.id)
        .filter(
            ReminderMessage.channel == "whatsapp",
            ReminderMessage.status == "sent",
            ReminderMessage.sent_at.isnot(None),
            ReminderMessage.sent_at >= since,
        )
    )
    if user_id is not None:
        q = q.filter(Invoice.user_id == user_id)
    rows = q.order_by(ReminderMessage.sent_at.desc()).limit(200).all()
    for message, invoice, client in rows:
        if phones_match(client.phone, client_phone):
            return message, invoice, client
    return None


def _fallback_client_match(
    db: Session,
    client_phone: str,
    *,
    user_id: UUID | None,
) -> tuple[Client, Invoice | None] | None:
    q = db.query(Client).filter(Client.phone.isnot(None))
    if user_id is not None:
        q = q.filter(Client.user_id == user_id)
    clients = q.order_by(Client.updated_at.desc()).limit(500).all()
    matched = next((c for c in clients if phones_match(c.phone, client_phone)), None)
    if matched is None:
        return None
    open_invoice = (
        db.query(Invoice)
        .filter(Invoice.client_id == matched.id, Invoice.balance > 0)
        .order_by(Invoice.days_overdue.desc())
        .first()
    )
    return matched, open_invoice


def inbound_already_recorded(db: Session, external_sid: str | None) -> bool:
    if not external_sid:
        return False
    return (
        db.query(WhatsappInboundMessage)
        .filter(WhatsappInboundMessage.external_sid == external_sid)
        .one_or_none()
        is not None
    )


def handle_inbound_whatsapp(
    db: Session,
    *,
    from_phone: str,
    to_phone: str,
    body: str,
    external_sid: str | None,
    routed_via: str = "shared_number",
) -> WhatsappInboundMessage:
    if inbound_already_recorded(db, external_sid):
        return (
            db.query(WhatsappInboundMessage)
            .filter(WhatsappInboundMessage.external_sid == external_sid)
            .one()
        )

    normalized_from = normalize_phone_e164(from_phone) or from_phone

    if routed_via != "shared_number":
        raise ValueError("Could not route inbound WhatsApp message to a user")

    match = _find_recent_outbound(db, client_phone=normalized_from, user_id=None)

    user_id: UUID | None = None
    invoice_id = None
    client_id = None
    reminder_message_id = None

    if match:
        message, invoice, client = match
        user_id = invoice.user_id
        invoice_id = invoice.id
        client_id = client.id
        reminder_message_id = message.id
        _apply_invoice_reply(db, invoice=invoice, client=client, body=body)
    else:
        fallback = _fallback_client_match(db, normalized_from, user_id=None)
        if fallback:
            client, invoice = fallback
            user_id = client.user_id
            client_id = client.id
            if invoice:
                invoice_id = invoice.id
                _apply_invoice_reply(db, invoice=invoice, client=client, body=body)
            else:
                db.add(
                    UserNotification(
                        user_id=client.user_id,
                        kind="whatsapp_reply",
                        title=f"WhatsApp reply from {client.name}",
                        body=body[:500],
                    )
                )

    if user_id is None:
        raise ValueError("Could not route inbound WhatsApp message")

    record = WhatsappInboundMessage(
        user_id=user_id,
        invoice_id=invoice_id,
        client_id=client_id,
        reminder_message_id=reminder_message_id,
        from_phone=normalized_from,
        to_phone=normalize_phone_e164(to_phone) or to_phone,
        body=body,
        external_sid=external_sid,
        routed_via=routed_via,
    )
    db.add(record)
    return record

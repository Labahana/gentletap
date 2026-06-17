"""Resend webhook verification and delivery events."""

import hashlib
import hmac
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import ReminderMessage


def verify_signature(payload: bytes, signature: str | None) -> bool:
    secret = get_settings().resend_webhook_secret
    if not secret or not signature:
        return False
    expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)


def handle_webhook_event(db: Session, payload: dict) -> None:
    event_type = payload.get("type", "")
    data = payload.get("data", {})
    email_id = data.get("email_id") or data.get("id")
    if not email_id:
        return

    message = (
        db.query(ReminderMessage)
        .filter(ReminderMessage.external_message_id == str(email_id))
        .one_or_none()
    )
    if message is None:
        return

    if event_type == "email.opened":
        if message.opened_at is None:
            message.opened_at = datetime.now(UTC)
            db.commit()
    elif event_type in ("email.delivered", "email.sent"):
        if message.status != "sent":
            message.status = "sent"
            if message.sent_at is None:
                message.sent_at = datetime.now(UTC)
            db.commit()

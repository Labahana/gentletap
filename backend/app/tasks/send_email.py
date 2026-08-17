"""Send reminder emails via Resend."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.config import get_settings
from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.message import Message
from app.services.email import send_email_via_resend, append_opt_out_footer
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


def create_and_send_message(
    db,
    *,
    org_id: str,
    invoice_id: str,
    client_id: str,
    subject: str,
    body: str,
    template_id: Optional[str] = None,
    ai_provider_used: Optional[str] = None,
) -> Message:
    client = db.query(Client).filter(Client.id == client_id).first()
    to_email = client.email if client else None
    if not to_email:
        raise ValueError("client_has_no_email")

    body_with_footer = append_opt_out_footer(body, org_id=org_id, email=to_email)

    msg = Message(
        org_id=org_id,
        invoice_id=invoice_id,
        client_id=client_id,
        template_id=template_id,
        channel="email",
        subject=subject,
        body=body_with_footer,
        status="queued",
        ai_provider_used=ai_provider_used,
    )
    db.add(msg)
    db.flush()

    result = send_email_via_resend(to_email, subject, body_with_footer)
    msg.provider_message_id = result.get("id")
    msg.status = "sent"
    msg.sent_at = datetime.now(timezone.utc)

    db.add(
        AuditLog(
            org_id=org_id,
            actor_type="system",
            actor_id=None,
            action="automated_send",
            entity_type="message",
            entity_id=msg.id,
            details={
                "invoice_id": invoice_id,
                "client_id": client_id,
                "template_id": template_id,
                "ai_provider": ai_provider_used,
                "subject": subject,
                "to": to_email,
            },
        )
    )
    db.flush()
    return msg


@celery_app.task(name="app.tasks.send_email.send_email_task")
def send_email_task(message_id: str) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        msg = db.query(Message).filter(Message.id == message_id).first()
        if not msg:
            return {"status": "error", "reason": "not_found"}
        if msg.status in ("sent", "delivered", "opened", "clicked"):
            return {"status": "skipped", "reason": "already_sent"}

        client = db.query(Client).filter(Client.id == msg.client_id).first()
        if not client or not client.email:
            msg.status = "failed"
            db.commit()
            return {"status": "error", "reason": "no_email"}

        result = send_email_via_resend(client.email, msg.subject, msg.body)
        msg.provider_message_id = result.get("id")
        msg.status = "sent"
        msg.sent_at = datetime.now(timezone.utc)
        db.commit()
        return {"status": "ok", "message_id": msg.id, "provider_id": msg.provider_message_id}
    except Exception as exc:
        db.rollback()
        logger.exception("send_email_task failed: %s", exc)
        raise
    finally:
        db.close()

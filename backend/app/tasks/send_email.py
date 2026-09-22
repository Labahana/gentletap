"""Send reminder emails via the org's preferred channel (Gmail OAuth or Resend)."""

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
from app.services.email import send_email_dispatch, append_opt_out_footer
from app.services.reminder_engine import get_or_create_org_settings
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)
settings = get_settings()


def resolve_org_send_via(db, org_id: str) -> str:
    """Return the org's preferred sender channel ('gmail' or 'resend').

    Falls back to 'resend' (GentleTap's domain) unless the org explicitly
    chose Gmail during onboarding and has an active Gmail connection.
    """
    settings_row = get_or_create_org_settings(db, org_id)
    pref = (settings_row.reminder_defaults or {}).get("sender_pref")
    if pref != "gmail":
        return "resend"
    from app.models.connection import Connection

    has_gmail = (
        db.query(Connection)
        .filter(
            Connection.org_id == org_id,
            Connection.provider.in_(["gmail", "google"]),
            Connection.status == "active",
        )
        .count()
        > 0
    )
    return "gmail" if has_gmail else "resend"


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
    # Commit the queued row up-front so a dispatch crash leaves a durable,
    # resumable record (send_email_task) instead of a lost send.
    db.commit()

    try:
        send_via = resolve_org_send_via(db, org_id)
        result = send_email_dispatch(
            org_id=org_id,
            to_email=to_email,
            subject=subject,
            body=body_with_footer,
            send_via=send_via,
            db=db,
        )
    except Exception as exc:
        msg.status = "failed"
        db.add(
            AuditLog(
                org_id=org_id,
                actor_type="system",
                actor_id=None,
                action="automated_send_failed",
                entity_type="message",
                entity_id=msg.id,
                details={
                    "invoice_id": invoice_id,
                    "client_id": client_id,
                    "subject": subject,
                    "to": to_email,
                    "error": str(exc)[:500],
                },
            )
        )
        db.commit()
        raise

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

        result = send_email_dispatch(
            org_id=msg.org_id,
            to_email=client.email,
            subject=msg.subject,
            body=msg.body,
            send_via=resolve_org_send_via(db, msg.org_id),
            db=db,
        )
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

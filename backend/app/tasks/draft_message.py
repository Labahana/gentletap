"""Draft reminder content via AI fallback chain."""

from __future__ import annotations

import logging
from typing import Any, Dict

from app.database import SessionLocal
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.reminder_schedule import ReminderSchedule
from app.models.template import Template
from app.models.user import User
from app.models.organization import Organization
from app.services.ai.provider import generate_reminder
from app.services.client_profile import get_or_create_profile
from app.services.email import render_template_placeholders
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


def draft_reminder_content(db, schedule: ReminderSchedule) -> Dict[str, Any]:
    invoice = db.query(Invoice).filter(Invoice.id == schedule.invoice_id).first()
    if not invoice:
        raise ValueError("invoice_not_found")
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    profile = get_or_create_profile(db, invoice.client_id, invoice.org_id)

    history = (
        db.query(Message)
        .filter(Message.invoice_id == invoice.id)
        .order_by(Message.created_at.desc())
        .limit(10)
        .all()
    )

    org = db.query(Organization).filter(Organization.id == invoice.org_id).first()
    owner = db.query(User).filter(User.id == org.owner_user_id).first() if org else None
    owner_name = (owner.full_name if owner and owner.full_name else None) or "Your Team"

    # Prefer saved org template for this tone when present
    template = None
    if schedule.template_id:
        template = db.query(Template).filter(Template.id == schedule.template_id).first()
    if not template:
        template = (
            db.query(Template)
            .filter(
                Template.org_id == invoice.org_id,
                Template.tone == schedule.tone,
                Template.ai_approved.is_(True),
            )
            .order_by(Template.is_default.desc(), Template.created_at.desc())
            .first()
        )

    if template and template.body:
        ctx = {
            "client_name": client.name if client else "there",
            "invoice_number": invoice.number,
            "amount": float(invoice.amount),
            "due_date": str(invoice.due_date) if invoice.due_date else "",
            "days_overdue": 0,
        }
        from datetime import date

        if invoice.due_date:
            ctx["days_overdue"] = max(0, (date.today() - invoice.due_date).days)
        subject = render_template_placeholders(template.subject, ctx)
        body = render_template_placeholders(template.body, ctx)
        provider = "template" if not template.ai_generated else "template"
        return {"subject": subject, "body": body, "provider": provider, "template_id": template.id}

    draft = generate_reminder(
        invoice=invoice,
        client=client,
        client_profile=profile,
        step_index=schedule.step_index,
        tone=schedule.tone,
        history=history,
        owner_name=owner_name,
    )
    return {
        "subject": draft.subject,
        "body": draft.body,
        "provider": draft.provider,
        "template_id": schedule.template_id,
    }


@celery_app.task(name="app.tasks.draft_message.draft_message_task")
def draft_message_task(invoice_id: str, step_index: int) -> Dict[str, Any]:
    db = SessionLocal()
    try:
        schedule = (
            db.query(ReminderSchedule)
            .filter(
                ReminderSchedule.invoice_id == invoice_id,
                ReminderSchedule.step_index == step_index,
            )
            .order_by(ReminderSchedule.created_at.desc())
            .first()
        )
        if not schedule:
            return {"status": "error", "reason": "schedule_not_found"}

        result = draft_reminder_content(db, schedule)
        schedule.draft_subject = result["subject"]
        schedule.draft_body = result["body"]
        db.commit()
        return {"status": "ok", **result}
    except Exception as exc:
        db.rollback()
        logger.exception("draft_message_task failed: %s", exc)
        raise
    finally:
        db.close()

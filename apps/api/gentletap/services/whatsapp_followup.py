"""Process delayed WhatsApp follow-up jobs."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Invoice, Profile, ReminderMessage, UserNotification, WhatsappFollowupJob
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.intelligence.engine import engine
from gentletap.intelligence.escalation import needs_human
from gentletap.intelligence.schemas import Action
from gentletap.services.context_builder import build_reminder_context
from gentletap.services.email_router import send_whatsapp_reminder
from gentletap.services.whatsapp_usage import (
    can_consume_whatsapp_quota,
    consume_whatsapp_quota,
    count_monthly_whatsapp_sent,
)


def process_whatsapp_followup(db: Session, job_id: UUID) -> None:
    job = db.query(WhatsappFollowupJob).filter(WhatsappFollowupJob.id == job_id).one_or_none()
    if job is None or job.status not in ("pending", "processing"):
        return

    invoice = db.query(Invoice).filter(Invoice.id == job.invoice_id).one()
    if float(invoice.balance) <= 0 or not invoice.sequence_active or invoice.sequence_paused:
        job.status = "cancelled"
        db.commit()
        return

    user = db.query(Profile).filter(Profile.id == job.user_id).one()
    if not invoice.client or not invoice.client.phone:
        job.status = "skipped_no_phone"
        db.commit()
        return

    ctx = build_reminder_context(db, invoice.id, user.id)
    if ctx is None:
        job.status = "failed"
        job.error_message = "context_not_found"
        db.commit()
        return

    ctx.invoice.approved = invoice.sequence_approved
    should, reason = engine.should_send(ctx)
    if not should:
        job.status = "cancelled"
        job.error_message = reason
        db.commit()
        return

    if needs_human(ctx):
        job.status = "cancelled"
        job.error_message = "escalation_recommended"
        db.commit()
        return

    decide_result = engine.decide(ctx)
    if decide_result.action in (Action.WAIT, Action.ESCALATE):
        job.status = "cancelled"
        job.error_message = decide_result.reason or decide_result.action.value
        db.commit()
        return

    ok, reason = can_consume_whatsapp_quota(db, user)
    if not ok:
        job.status = "skipped_cap"
        job.error_message = reason
        if reason == "monthly_cap_reached":
            existing = (
                db.query(UserNotification)
                .filter(
                    UserNotification.user_id == user.id,
                    UserNotification.kind == "whatsapp_cap",
                    UserNotification.read_at.is_(None),
                    UserNotification.created_at
                    >= datetime.now(UTC).replace(day=1, hour=0, minute=0, second=0, microsecond=0),
                )
                .first()
            )
            if existing is None:
                db.add(
                    UserNotification(
                        user_id=user.id,
                        kind="whatsapp_cap",
                        title="WhatsApp monthly limit reached",
                        body="Remaining reminders will use email only. Buy more WhatsApp messages in Connections.",
                    )
                )
        db.commit()
        return

    tone = job.tone or (decide_result.tone.value if decide_result.tone else None)
    payload = wa_templates.build_payload(
        ctx,
        sender_name=ctx.sender_name or user.full_name or user.email.split("@")[0],
        sequence_step=job.sequence_step,
        tone=tone,
    )

    message = ReminderMessage(
        invoice_id=invoice.id,
        sequence_step=job.sequence_step,
        subject=f"WhatsApp · {payload.template_key}",
        body=payload.preview_body,
        tone=tone,
        channel="whatsapp",
        status="approved",
    )
    db.add(message)
    db.flush()

    try:
        used_before = count_monthly_whatsapp_sent(db, user.id)
        external_id = send_whatsapp_reminder(
            db,
            user.id,
            message,
            to_phone=invoice.client.phone,
            sequence_step=job.sequence_step,
            tone=tone,
        )
        consume_whatsapp_quota(db, user, used_before=used_before + 1)
        message.status = "sent"
        message.sent_at = datetime.now(UTC)
        message.external_message_id = external_id
        job.status = "sent"
        job.reminder_message_id = message.id
    except Exception as exc:
        message.status = "failed"
        message.error_message = str(exc)
        job.status = "failed"
        job.error_message = str(exc)

    db.commit()

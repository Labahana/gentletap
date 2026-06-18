"""Reminder preview, approval, and send orchestration."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from gentletap.plans import has_whatsapp
from gentletap.database import (
    AgentDecision,
    EmailPreference,
    Invoice,
    Profile,
    ReminderJob,
    ReminderMessage,
    UserNotification,
)
from gentletap.intelligence.channel_selector import whatsapp_followup_planned
from gentletap.intelligence.engine import engine
from gentletap.intelligence.escalation import escalation_recommendation
from gentletap.intelligence.schemas import Action, Channel
from gentletap.services.context_builder import build_reminder_context
from gentletap.services.email_router import (
    get_send_provider,
    has_delivery_capability,
    send_reminder_message,
    send_whatsapp_reminder,
)
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.services.sequences import advance_sequence_after_send, schedule_next_job, scheduled_for_current_step
from gentletap.services.whatsapp_scheduler import schedule_whatsapp_followup
from gentletap.services.whatsapp_usage import (
    can_consume_whatsapp_quota,
    consume_whatsapp_quota,
    count_monthly_whatsapp_sent,
    should_schedule_whatsapp_for_step,
)

from gentletap.services.plan_limits import ensure_can_activate, mark_collection_started

def generate_draft(db: Session, invoice: Invoice, *, preview: bool = False) -> ReminderMessage:
    ctx = build_reminder_context(db, invoice.id, invoice.user_id)
    if ctx is None:
        raise ValueError("Invoice context not found")

    ctx.invoice.approved = True if preview else invoice.sequence_approved
    result = engine.decide(ctx)

    if not preview:
        db.add(
            AgentDecision(
                invoice_id=invoice.id,
                decision=result.model_dump(mode="json"),
            )
        )

    if result.action == Action.WAIT:
        raise ValueError(result.reason or "Cannot generate reminder")

    if result.action == Action.ESCALATE:
        raise ValueError("escalation_recommended")

    if result.message is None:
        raise ValueError("No message generated")

    existing = (
        db.query(ReminderMessage)
        .filter(
            ReminderMessage.invoice_id == invoice.id,
            ReminderMessage.sequence_step == invoice.sequence_step,
            ReminderMessage.status.in_(("draft", "pending_approval", "approved")),
        )
        .one_or_none()
    )
    if existing:
        existing.subject = result.message.subject
        existing.body = result.message.body
        existing.tone = result.tone.value if result.tone else None
        existing.status = "draft" if preview else "pending_approval"
        return existing

    msg = ReminderMessage(
        invoice_id=invoice.id,
        sequence_step=invoice.sequence_step,
        subject=result.message.subject,
        body=result.message.body,
        tone=result.tone.value if result.tone else None,
        channel=result.channel.value if result.channel else "email",
        status="draft" if preview else "pending_approval",
    )
    db.add(msg)
    return msg


def preview_overdue_invoices(db: Session, user_id: UUID, limit: int = 10) -> list[dict]:
    invoices = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user_id,
            Invoice.balance > 0,
            Invoice.days_overdue > 0,
        )
        .order_by(Invoice.days_overdue.desc(), Invoice.balance.desc())
        .limit(limit)
        .all()
    )
    previews = []
    for inv in invoices:
        try:
            draft = generate_draft(db, inv, preview=True)
            db.flush()
            ctx = build_reminder_context(db, inv.id, user_id)
            wa_followup = False
            if ctx:
                schedule_wa, _ = should_schedule_whatsapp_for_step(
                    db,
                    user=db.query(Profile).filter(Profile.id == user_id).one(),
                    client_phone=ctx.client_phone,
                    sequence_step=inv.sequence_step,
                )
                wa_followup = schedule_wa and whatsapp_followup_planned(ctx)
            previews.append(
                {
                    "invoice_id": str(inv.id),
                    "doc_number": inv.doc_number,
                    "client_name": inv.client.name if inv.client else "",
                    "balance": float(inv.balance),
                    "days_overdue": inv.days_overdue,
                    "status": inv.status,
                    "reminder_id": str(draft.id),
                    "subject": draft.subject,
                    "body": draft.body,
                    "tone": draft.tone,
                    "channel": draft.channel,
                    "whatsapp_followup": wa_followup,
                }
            )
        except ValueError as exc:
            previews.append(
                {
                    "invoice_id": str(inv.id),
                    "doc_number": inv.doc_number,
                    "client_name": inv.client.name if inv.client else "",
                    "balance": float(inv.balance),
                    "days_overdue": inv.days_overdue,
                    "status": inv.status,
                    "error": str(exc),
                }
            )
    db.commit()
    return previews


def approve_all_overdue(db: Session, user: Profile) -> dict:
    if not has_delivery_capability(db, user.id, plan=user.plan):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect Gmail, verify an email sender, or connect WhatsApp before going live",
        )

    from gentletap.plans import has_unlimited_sequences
    from gentletap.config import get_settings
    from gentletap.services.plan_limits import count_monthly_collections, uses_new_monthly_slot

    overdue = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user.id,
            Invoice.balance > 0,
            Invoice.days_overdue > 0,
        )
        .order_by(Invoice.days_overdue.desc(), Invoice.balance.desc())
        .all()
    )
    to_activate = [inv for inv in overdue if not inv.sequence_active and float(inv.balance) > 0]

    # For free plan: cap activation at the monthly limit instead of hard-blocking.
    plan_cap_total = 0
    plan_cap_remaining = 0
    if not has_unlimited_sequences(user.plan) and to_activate:
        limit = get_settings().free_plan_monthly_collection_limit
        used = count_monthly_collections(db, user.id)
        available = max(0, limit - used)
        plan_cap_total = limit
        plan_cap_remaining = available
        new_slot_invoices = [inv for inv in to_activate if uses_new_monthly_slot(inv)]
        if len(new_slot_invoices) > available:
            # Trim to_activate: keep invoices that fit within available slots.
            allowed_ids: set = set()
            slots_taken = 0
            for inv in to_activate:
                if not uses_new_monthly_slot(inv):
                    allowed_ids.add(inv.id)
                elif slots_taken < available:
                    allowed_ids.add(inv.id)
                    slots_taken += 1
            to_activate = [inv for inv in to_activate if inv.id in allowed_ids]

    activated = 0
    skipped_escalation: list[dict] = []
    skipped_other: list[dict] = []
    for inv in to_activate:
        inv.sequence_approved = True
        inv.sequence_paused = False
        skip = False
        skip_reason = ""
        if inv.client and (
            inv.client.email or (has_whatsapp(user.plan) and inv.client.phone)
        ):
            try:
                generate_draft(db, inv)
            except ValueError as exc:
                skip = True
                skip_reason = str(exc)
        else:
            skip = True
            skip_reason = "no_contact_method"
        if skip:
            inv.sequence_approved = False
            entry = {
                "invoice_id": str(inv.id),
                "doc_number": inv.doc_number,
                "reason": skip_reason,
            }
            if skip_reason == "escalation_recommended":
                skipped_escalation.append(entry)
            else:
                skipped_other.append(entry)
            continue
        mark_collection_started(inv)
        inv.sequence_active = True
        schedule_next_job(db, inv, scheduled_for=scheduled_for_current_step(db, inv))
        activated += 1

    pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
    if pref is None:
        pref = EmailPreference(user_id=user.id)
        db.add(pref)
    pref.require_approval = False
    pref.first_batch_approved_at = datetime.now(UTC)

    user.onboarding_step = "live"
    user.onboarding_completed_at = datetime.now(UTC)
    db.commit()

    return {
        "activated": activated,
        "skipped_escalation": skipped_escalation,
        "skipped_other": skipped_other,
        "message": f"Activated {activated} invoice sequences",
        "plan_cap_total": plan_cap_total,
        "plan_cap_remaining": plan_cap_remaining,
    }


def process_due_job(db: Session, job_id: UUID) -> None:
    job = db.query(ReminderJob).filter(ReminderJob.id == job_id).one_or_none()
    if job is None or job.status not in ("pending", "processing"):
        return

    invoice = db.query(Invoice).filter(Invoice.id == job.invoice_id).one()
    if float(invoice.balance) <= 0 or not invoice.sequence_active or invoice.sequence_paused:
        job.status = "cancelled"
        db.commit()
        return

    user = db.query(Profile).filter(Profile.id == invoice.user_id).one()
    ctx = build_reminder_context(db, invoice.id, invoice.user_id)
    if ctx is None:
        job.status = "failed"
        db.commit()
        return

    ctx.invoice.approved = invoice.sequence_approved
    result = engine.decide(ctx)
    db.add(AgentDecision(invoice_id=invoice.id, decision=result.model_dump(mode="json")))

    if result.action == Action.WAIT:
        job.status = "cancelled"
        db.commit()
        return

    if result.action == Action.ESCALATE:
        job.status = "cancelled"
        invoice.sequence_active = False
        db.add(
            UserNotification(
                user_id=user.id,
                kind="escalation",
                title=f"Invoice #{invoice.doc_number} needs you",
                body=escalation_recommendation(ctx),
                invoice_id=invoice.id,
            )
        )
        db.commit()
        return

    if result.action == Action.SEND and result.send_at and result.send_at > datetime.now(UTC):
        job.scheduled_for = result.send_at
        job.status = "pending"
        db.commit()
        return

    message = (
        db.query(ReminderMessage)
        .filter(
            ReminderMessage.invoice_id == invoice.id,
            ReminderMessage.sequence_step == job.sequence_step,
            ReminderMessage.channel == "email",
        )
        .order_by(ReminderMessage.created_at.desc())
        .first()
    )
    if result.message:
        if message is None:
            message = ReminderMessage(
                invoice_id=invoice.id,
                sequence_step=job.sequence_step,
                subject=result.message.subject,
                body=result.message.body,
                tone=result.tone.value if result.tone else None,
                channel="email",
                status="approved",
            )
            db.add(message)
        else:
            message.subject = result.message.subject
            message.body = result.message.body
            message.tone = result.tone.value if result.tone else None
            message.status = "approved"
        db.flush()
    elif message is None:
        job.status = "failed"
        db.commit()
        return

    client_email = invoice.client.email if invoice.client else None
    client_phone = invoice.client.phone if invoice.client else None
    step = job.sequence_step

    email_required = step == 0 or step >= 4
    can_email = bool(client_email and get_send_provider(db, user.id))
    schedule_wa, _wa_reason = should_schedule_whatsapp_for_step(
        db,
        user=user,
        client_phone=client_phone,
        sequence_step=step,
    )

    if email_required and not can_email:
        job.status = "failed"
        db.commit()
        return

    if not email_required and not can_email and not schedule_wa:
        job.status = "failed"
        db.commit()
        return

    sent_email = False
    sent_whatsapp = False
    try:
        if can_email and (email_required or client_email):
            external_id = send_reminder_message(
                db,
                user.id,
                message,
                channel=Channel.EMAIL,
                to_email=client_email,
            )
            message.status = "sent"
            message.sent_at = datetime.now(UTC)
            message.external_message_id = external_id
            sent_email = True

        if schedule_wa and sent_email:
            schedule_whatsapp_followup(
                db,
                user=user,
                invoice=invoice,
                sequence_step=step,
                tone=result.tone.value if result.tone else None,
                after=datetime.now(UTC),
            )

        if schedule_wa and not sent_email and not email_required:
            wa_ok, wa_reason = can_consume_whatsapp_quota(db, user)
            if not wa_ok:
                job.status = "failed"
                db.commit()
                return

            tone = result.tone.value if result.tone else None
            payload = wa_templates.build_payload(
                ctx,
                sender_name=ctx.sender_name or user.full_name or user.email.split("@")[0],
                sequence_step=step,
                tone=tone,
            )
            wa_message = ReminderMessage(
                invoice_id=invoice.id,
                sequence_step=step,
                subject=f"WhatsApp · {payload.template_key}",
                body=payload.preview_body,
                tone=tone,
                channel="whatsapp",
                status="approved",
            )
            db.add(wa_message)
            db.flush()

            used_before = count_monthly_whatsapp_sent(db, user.id)
            external_id = send_whatsapp_reminder(
                db,
                user.id,
                wa_message,
                to_phone=client_phone or "",
                sequence_step=step,
                tone=tone,
            )
            consume_whatsapp_quota(db, user, used_before=used_before + 1)
            wa_message.status = "sent"
            wa_message.sent_at = datetime.now(UTC)
            wa_message.external_message_id = external_id
            sent_whatsapp = True

        if not sent_email and not sent_whatsapp:
            job.status = "failed"
            db.commit()
            return

        job.status = "sent"
        advance_sequence_after_send(db, invoice)
    except Exception as exc:
        if message.status != "sent":
            message.status = "failed"
            message.error_message = str(exc)
        job.status = "failed"

    db.commit()

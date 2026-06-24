"""Reminder preview, approval, and send orchestration."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func
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
from gentletap.intelligence.message_generator import generate_message
from gentletap.scale_limits import ACTIVATION_BATCH, AUTO_ACTIVATE_BATCH
from gentletap.services.context_builder import build_reminder_context
from gentletap.services.reminder_contacts import effective_reminder_email, effective_reminder_phone
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


def _firm_tone_insight(days_overdue: int) -> str:
    if days_overdue >= 30:
        return f"{days_overdue} days overdue — we'll lead with a firmer, clearer tone on this one."
    return f"{days_overdue} days overdue — we'll keep the tone polite but clear."


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
                    "client_email": ctx.client_email if ctx else (inv.client.email if inv.client else None),
                    "balance": float(inv.balance),
                    "days_overdue": inv.days_overdue,
                    "status": inv.status,
                    "reminder_id": str(draft.id),
                    "subject": draft.subject,
                    "body": draft.body,
                    "tone": draft.tone,
                    "channel": draft.channel,
                    "whatsapp_followup": wa_followup,
                    "payment_link": inv.payment_link,
                }
            )
        except ValueError as exc:
            err = str(exc)
            base = {
                "invoice_id": str(inv.id),
                "doc_number": inv.doc_number,
                "client_name": inv.client.name if inv.client else "",
                "client_email": inv.client.email if inv.client else None,
                "balance": float(inv.balance),
                "days_overdue": inv.days_overdue,
                "status": inv.status,
            }
            if err == "escalation_recommended":
                base["needs_firm_tone"] = True
                base["tone_insight"] = _firm_tone_insight(inv.days_overdue)
            else:
                base["error"] = err
            previews.append(base)
    previews.sort(key=lambda row: (0 if row.get("body") else 1, -row.get("days_overdue", 0)))
    db.commit()
    return previews


def approve_all_overdue(
    db: Session,
    user: Profile,
    *,
    finalize_onboarding: bool = True,
) -> dict:
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
        .limit(ACTIVATION_BATCH)
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
            effective_reminder_email(inv)
            or (has_whatsapp(user.plan) and effective_reminder_phone(inv))
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

    if finalize_onboarding:
        pref = db.query(EmailPreference).filter(EmailPreference.user_id == user.id).one_or_none()
        if pref is None:
            pref = EmailPreference(user_id=user.id)
            db.add(pref)
        pref.require_approval = False
        pref.first_batch_approved_at = datetime.now(UTC)
        user.onboarding_step = "live"
        user.onboarding_completed_at = datetime.now(UTC)

    db.commit()

    remaining = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.user_id == user.id,
            Invoice.balance > 0,
            Invoice.days_overdue > 0,
            Invoice.sequence_active.is_(False),
        )
        .scalar()
        or 0
    )

    return {
        "activated": activated,
        "skipped_escalation": skipped_escalation,
        "skipped_other": skipped_other,
        "message": f"Activated {activated} invoice sequences",
        "plan_cap_total": plan_cap_total,
        "plan_cap_remaining": plan_cap_remaining,
        "has_more": remaining > 0,
    }


def _notify_escalation(db: Session, invoice: Invoice, user_id: UUID) -> None:
    """Surface an invoice that the engine flagged for human handoff (e.g. 21+ days overdue).

    De-duplicated: skips if an unread escalation notification already exists for this invoice.
    """
    existing = (
        db.query(UserNotification)
        .filter(
            UserNotification.user_id == user_id,
            UserNotification.invoice_id == invoice.id,
            UserNotification.kind == "escalation",
            UserNotification.read_at.is_(None),
        )
        .first()
    )
    if existing is not None:
        return
    ctx = build_reminder_context(db, invoice.id, user_id)
    body = (
        escalation_recommendation(ctx)
        if ctx is not None
        else f"Invoice #{invoice.doc_number or invoice.qb_invoice_id} needs a personal touch."
    )
    db.add(
        UserNotification(
            user_id=user_id,
            kind="escalation",
            title=f"Invoice #{invoice.doc_number or '—'} needs you",
            body=body,
            invoice_id=invoice.id,
        )
    )


def auto_activate_new_invoices(db: Session, user: Profile) -> int:
    """Auto-activate genuinely new overdue invoices for users who have completed onboarding.

    Only touches invoices that have never been activated or manually paused
    (sequence_approved=False, sequence_paused=False, sequence_active=False).
    Respects plan limits silently — stops when the cap is reached rather than erroring.
    Returns the number of newly activated invoices.
    """
    if user.onboarding_step != "live":
        return 0

    if not has_delivery_capability(db, user.id, plan=user.plan):
        return 0

    from gentletap.plans import has_unlimited_sequences
    from gentletap.config import get_settings
    from gentletap.services.plan_limits import count_monthly_collections, uses_new_monthly_slot

    candidates = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user.id,
            Invoice.balance > 0,
            Invoice.days_overdue > 0,
            Invoice.sequence_active.is_(False),
            Invoice.sequence_paused.is_(False),
            Invoice.sequence_approved.is_(False),
            Invoice.dispute_flag.is_(False),
        )
        .order_by(Invoice.days_overdue.desc(), Invoice.balance.desc())
        .limit(AUTO_ACTIVATE_BATCH)
        .all()
    )

    if not candidates:
        return 0

    # Respect plan limits — trim list if on free plan
    to_activate = candidates
    if not has_unlimited_sequences(user.plan):
        limit = get_settings().free_plan_monthly_collection_limit
        used = count_monthly_collections(db, user.id)
        available = max(0, limit - used)
        if available <= 0:
            return 0
        slots_taken = 0
        allowed: list[Invoice] = []
        for inv in candidates:
            if not uses_new_monthly_slot(inv):
                allowed.append(inv)
            elif slots_taken < available:
                allowed.append(inv)
                slots_taken += 1
        to_activate = allowed

    activated = 0
    activated_snippets: list[str] = []
    for inv in to_activate:
        if not inv.client or (
            not effective_reminder_email(inv)
            and not (has_whatsapp(user.plan) and effective_reminder_phone(inv))
        ):
            continue
        inv.sequence_approved = True
        try:
            generate_draft(db, inv)
        except ValueError as exc:
            inv.sequence_approved = False
            if str(exc) == "escalation_recommended":
                _notify_escalation(db, inv, user.id)
            continue
        mark_collection_started(inv)
        inv.sequence_active = True
        schedule_next_job(db, inv, scheduled_for=scheduled_for_current_step(db, inv))
        activated += 1
        client_name = inv.client.name if inv.client else "a client"
        activated_snippets.append(f"#{inv.doc_number or '—'} ({client_name})")

    if activated > 0:
        summary = ", ".join(activated_snippets[:3])
        if len(activated_snippets) > 3:
            summary += f" and {len(activated_snippets) - 3} more"
        db.add(
            UserNotification(
                user_id=user.id,
                kind="auto_activated",
                title=f"{activated} new invoice{'s' if activated > 1 else ''} activated automatically",
                body=f"GentleTap detected new overdue invoices and started reminders: {summary}.",
                invoice_id=to_activate[0].id if to_activate else None,
            )
        )

    # Commit activations AND any escalation notifications queued during the loop.
    db.commit()

    return activated


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
    result = engine.decide(ctx, generate_message=False)
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
        if result.action != Action.SEND or result.tone is None:
            job.status = "failed"
            db.commit()
            return
        channel = result.channel or Channel.EMAIL
        generated = generate_message(ctx, result.tone, channel=channel)
        message = ReminderMessage(
            invoice_id=invoice.id,
            sequence_step=job.sequence_step,
            subject=generated.subject,
            body=generated.body,
            tone=result.tone.value,
            channel="email",
            status="approved",
        )
        db.add(message)
        db.flush()

    client_email = effective_reminder_email(invoice) if invoice.client else None
    client_phone = effective_reminder_phone(invoice) if invoice.client else None
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

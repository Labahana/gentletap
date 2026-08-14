"""Reminder sequence scheduling and payment cancellation."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Invoice, ReminderJob

# Day overdue thresholds per sequence step (0–4). Default when the user has no
# custom cadence configured.
SEQUENCE_DAY_THRESHOLDS = [0, 3, 7, 14, 21]
MAX_SEQUENCE_STEP = 4
# Minimum days between consecutive reminders, regardless of how overdue an invoice is.
MIN_STEP_GAP_DAYS = 2


def _resolve_cadence(db: Session, invoice: Invoice) -> dict:
    from gentletap.services.automation_settings import cadence_for

    return cadence_for(db, invoice.user_id, client=invoice.client, invoice=invoice)


def _day_offsets(cadence: dict) -> list[int]:
    steps = cadence.get("steps") or []
    offsets = [int(s.get("day_offset", 0)) for s in steps if isinstance(s, dict)]
    return offsets or list(SEQUENCE_DAY_THRESHOLDS)


def _max_step(cadence: dict) -> int:
    return max(0, len(_day_offsets(cadence)) - 1)


def cancel_invoice_jobs(db: Session, invoice_id: UUID) -> int:
    jobs = (
        db.query(ReminderJob)
        .filter(ReminderJob.invoice_id == invoice_id, ReminderJob.status.in_(("pending", "processing")))
        .all()
    )
    for job in jobs:
        job.status = "cancelled"
    from gentletap.services.whatsapp_scheduler import cancel_whatsapp_followups

    cancel_whatsapp_followups(db, invoice_id)
    return len(jobs)


def mark_invoice_paid(db: Session, invoice: Invoice) -> None:
    invoice.balance = 0
    invoice.status = "paid"
    invoice.paid_at = datetime.now(UTC)
    invoice.client_claimed_paid_at = None
    invoice.sequence_active = False
    invoice.sequence_paused = True
    cancel_invoice_jobs(db, invoice.id)

    # Optional "thanks for paying" note when enabled on the account cadence.
    try:
        cadence = _resolve_cadence(db, invoice)
        if cadence.get("thank_you_on_payment"):
            _queue_thank_you(db, invoice, cadence)
    except Exception:
        pass


def _queue_thank_you(db: Session, invoice: Invoice, cadence: dict) -> None:
    from gentletap.database import ReminderMessage

    existing = (
        db.query(ReminderMessage)
        .filter(ReminderMessage.invoice_id == invoice.id, ReminderMessage.channel == "thank_you")
        .one_or_none()
    )
    if existing is not None:
        return
    client_name = invoice.client.name if invoice.client else "there"
    doc = invoice.doc_number or "your invoice"
    db.add(
        ReminderMessage(
            invoice_id=invoice.id,
            sequence_step=-1,
            subject=f"Thanks for paying invoice #{doc}",
            body=(
                f"Hi {client_name},\n\n"
                f"Thanks for taking care of invoice #{doc} — really appreciate it.\n\n"
                "Talk soon,"
            ),
            tone="soft",
            channel="thank_you",
            status="pending_approval",
        )
    )


def reopen_invoice(invoice: Invoice) -> bool:
    """Clear paid state when a previously-paid invoice has a balance again.

    Resets the sequence to a fresh cycle so auto-activation can pick it up.
    Returns True if the invoice was reopened. Does not touch disputes or
    invoices paused for reasons other than payment.
    """
    if float(invoice.balance) <= 0 or invoice.paid_at is None:
        return False
    invoice.paid_at = None
    invoice.sequence_paused = False
    invoice.sequence_approved = False
    invoice.sequence_active = False
    invoice.sequence_step = 0
    recalculate_invoice_status(invoice)
    return True


def _dispatch_immediate(job: ReminderJob, scheduled: datetime) -> None:
    now = datetime.now(UTC)
    if scheduled <= now + timedelta(minutes=2):
        try:
            from gentletap.tasks.reminders import send_reminder_job

            async_result = send_reminder_job.delay(str(job.id))
            job.celery_task_id = getattr(async_result, "id", None)
        except Exception:
            pass


def schedule_next_job(
    db: Session,
    invoice: Invoice,
    *,
    delay_days: int | None = None,
    scheduled_for: datetime | None = None,
) -> ReminderJob | None:
    from gentletap.services.automation_settings import (
        get_automation_settings,
        is_paused,
        next_send_time,
        should_suppress_invoice,
    )

    if not invoice.sequence_active or invoice.sequence_paused or float(invoice.balance) <= 0:
        return None

    settings = get_automation_settings(db, invoice.user_id)
    if should_suppress_invoice(settings=settings, invoice=invoice, client=invoice.client):
        return None

    cadence = _resolve_cadence(db, invoice)
    next_step = invoice.sequence_step
    if next_step > _max_step(cadence):
        return None

    now = datetime.now(UTC)
    if scheduled_for is not None:
        scheduled = scheduled_for
    elif delay_days is not None:
        scheduled = now + timedelta(days=delay_days)
    else:
        scheduled = now + timedelta(hours=1)

    # Snap into the user's send window when one is configured.
    if settings.send_window:
        scheduled = next_send_time(
            now_utc=scheduled,
            timezone_name=settings.timezone,
            send_window=settings.send_window,
            skip_weekends=settings.skip_weekends,
            skip_holidays=settings.skip_holidays,
            holidays_country=settings.holidays_country,
        )

    if is_paused(settings) and settings.pause_until is not None:
        pause_until = settings.pause_until
        if pause_until.tzinfo is None:
            pause_until = pause_until.replace(tzinfo=UTC)
        if scheduled < pause_until:
            scheduled = pause_until

    existing = (
        db.query(ReminderJob)
        .filter(
            ReminderJob.invoice_id == invoice.id,
            ReminderJob.sequence_step == next_step,
        )
        .one_or_none()
    )
    if existing:
        if existing.status == "pending":
            return existing
        if existing.status in ("cancelled", "failed", "sent"):
            # A previously-sent job at this step means the invoice was paid and
            # reopened — flip it back to pending so the sequence can re-fire.
            existing.status = "pending"
            existing.scheduled_for = scheduled
            existing.celery_task_id = None
            existing.last_error = None
            db.flush()
            _dispatch_immediate(existing, scheduled)
            return existing
        return existing

    job = ReminderJob(
        invoice_id=invoice.id,
        scheduled_for=scheduled,
        sequence_step=next_step,
        status="pending",
    )
    db.add(job)
    db.flush()
    _dispatch_immediate(job, scheduled)
    return job


def advance_sequence_after_send(db: Session, invoice: Invoice) -> None:
    cadence = _resolve_cadence(db, invoice)
    invoice.sequence_step += 1
    invoice.last_reminder_sent_at = datetime.now(UTC)
    if invoice.sequence_step > _max_step(cadence):
        invoice.sequence_active = False
        return
    scheduled_for = _scheduled_for_next_step(db, invoice)
    schedule_next_job(db, invoice, scheduled_for=scheduled_for)


def scheduled_for_current_step(db: Session, invoice: Invoice) -> datetime:
    """Earliest send time for the invoice's current sequence step."""
    # Step 0 sends immediately; follow-up spacing is handled by schedule_next_job.
    # Avoid calling the full AI engine here — it was only used for send_at, which is always now.
    return datetime.now(UTC)


def _scheduled_for_next_step(db: Session, invoice: Invoice) -> datetime:
    """Schedule follow-up reminders using overdue-day spacing only (not a global send window)."""
    now = datetime.now(UTC)
    return now + timedelta(days=_days_until_next_step(invoice))


def _days_until_next_step(invoice: Invoice) -> int:
    """Spacing to the next reminder using the natural gap between sequence thresholds.

    Each invoice follows its own timeline: the cadence between follow-ups is fixed
    (3, 4, 7, 7 days) no matter how overdue the invoice was when it entered the
    sequence — so a long-overdue invoice is never blasted on consecutive days.
    """
    # Use a DB-free default here; cadence-aware spacing is applied when the job is
    # scheduled via schedule_next_job (which has the session).
    step = invoice.sequence_step
    if step >= len(SEQUENCE_DAY_THRESHOLDS):
        return 7
    prev_threshold = SEQUENCE_DAY_THRESHOLDS[step - 1] if step > 0 else 0
    next_threshold = SEQUENCE_DAY_THRESHOLDS[step]
    return max(MIN_STEP_GAP_DAYS, next_threshold - prev_threshold)


def recalculate_invoice_status(invoice: Invoice) -> None:
    balance = Decimal(str(invoice.balance))
    if balance <= 0:
        invoice.status = "paid"
        invoice.days_overdue = 0
        return
    if invoice.due_date is None:
        invoice.status = "yellow"
        invoice.days_overdue = 0
        return
    days = (date.today() - invoice.due_date).days
    invoice.days_overdue = max(days, 0)
    if days <= 0:
        invoice.status = "green"
    elif days <= 7:
        invoice.status = "yellow"
    else:
        invoice.status = "red"

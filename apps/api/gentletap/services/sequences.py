"""Reminder sequence scheduling and payment cancellation."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Invoice, ReminderJob

# Day overdue thresholds per sequence step (0–4)
SEQUENCE_DAY_THRESHOLDS = [0, 3, 7, 14, 21]
MAX_SEQUENCE_STEP = 4
# Minimum days between consecutive reminders, regardless of how overdue an invoice is.
MIN_STEP_GAP_DAYS = 2


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
    if not invoice.sequence_active or invoice.sequence_paused or float(invoice.balance) <= 0:
        return None

    next_step = invoice.sequence_step
    if next_step > MAX_SEQUENCE_STEP:
        return None

    now = datetime.now(UTC)
    if scheduled_for is not None:
        scheduled = scheduled_for
    elif delay_days is not None:
        scheduled = now + timedelta(days=delay_days)
    else:
        scheduled = now + timedelta(hours=1)

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
        if existing.status in ("cancelled", "failed"):
            existing.status = "pending"
            existing.scheduled_for = scheduled
            existing.celery_task_id = None
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
    invoice.sequence_step += 1
    invoice.last_reminder_sent_at = datetime.now(UTC)
    if invoice.sequence_step > MAX_SEQUENCE_STEP:
        invoice.sequence_active = False
        return
    scheduled_for = _scheduled_for_next_step(db, invoice)
    schedule_next_job(db, invoice, scheduled_for=scheduled_for)


def scheduled_for_current_step(db: Session, invoice: Invoice) -> datetime:
    """Earliest send time for the invoice's current sequence step."""
    now = datetime.now(UTC)
    # First reminder after activation: send immediately (any time, per account).
    if invoice.sequence_step == 0:
        return now

    from gentletap.intelligence.engine import engine
    from gentletap.intelligence.schemas import Action
    from gentletap.services.context_builder import build_reminder_context

    ctx = build_reminder_context(db, invoice.id, invoice.user_id)
    if ctx is None:
        return now
    ctx.invoice.approved = invoice.sequence_approved
    result = engine.decide(ctx)
    if result.action == Action.SEND and result.send_at and result.send_at > now:
        return result.send_at
    return now


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

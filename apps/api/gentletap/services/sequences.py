"""Reminder sequence scheduling and payment cancellation."""

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Invoice, ReminderJob

# Day overdue thresholds per sequence step (0–4)
SEQUENCE_DAY_THRESHOLDS = [0, 3, 7, 14, 21]
MAX_SEQUENCE_STEP = 4


def cancel_invoice_jobs(db: Session, invoice_id: UUID) -> int:
    jobs = (
        db.query(ReminderJob)
        .filter(ReminderJob.invoice_id == invoice_id, ReminderJob.status == "pending")
        .all()
    )
    for job in jobs:
        job.status = "cancelled"
    return len(jobs)


def mark_invoice_paid(db: Session, invoice: Invoice) -> None:
    invoice.balance = 0
    invoice.status = "paid"
    invoice.paid_at = datetime.now(UTC)
    invoice.sequence_active = False
    invoice.sequence_paused = True
    cancel_invoice_jobs(db, invoice.id)


def schedule_next_job(db: Session, invoice: Invoice, *, delay_days: int | None = None) -> ReminderJob | None:
    if not invoice.sequence_active or invoice.sequence_paused or float(invoice.balance) <= 0:
        return None

    next_step = invoice.sequence_step
    if next_step > MAX_SEQUENCE_STEP:
        return None

    existing = (
        db.query(ReminderJob)
        .filter(
            ReminderJob.invoice_id == invoice.id,
            ReminderJob.sequence_step == next_step,
            ReminderJob.status == "pending",
        )
        .one_or_none()
    )
    if existing:
        return existing

    if delay_days is not None:
        scheduled = datetime.now(UTC) + timedelta(days=delay_days)
    else:
        scheduled = datetime.now(UTC) + timedelta(hours=1)

    job = ReminderJob(
        invoice_id=invoice.id,
        scheduled_for=scheduled,
        sequence_step=next_step,
        status="pending",
    )
    db.add(job)
    return job


def advance_sequence_after_send(db: Session, invoice: Invoice) -> None:
    invoice.sequence_step += 1
    invoice.last_reminder_sent_at = datetime.now(UTC)
    if invoice.sequence_step > MAX_SEQUENCE_STEP:
        invoice.sequence_active = False
        return
    schedule_next_job(db, invoice, delay_days=_days_until_next_step(invoice))


def _days_until_next_step(invoice: Invoice) -> int:
    step = invoice.sequence_step
    if step >= len(SEQUENCE_DAY_THRESHOLDS):
        return 7
    current_threshold = SEQUENCE_DAY_THRESHOLDS[step - 1] if step > 0 else 0
    next_threshold = SEQUENCE_DAY_THRESHOLDS[step]
    return max(1, next_threshold - max(invoice.days_overdue, current_threshold))


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

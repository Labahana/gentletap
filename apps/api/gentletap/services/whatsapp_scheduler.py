"""Schedule staggered WhatsApp follow-ups after email sends."""

from datetime import UTC, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from gentletap.database import Invoice, Profile, WhatsappFollowupJob


def compute_whatsapp_followup_time(*, after: datetime, user_timezone: str) -> datetime:
    """Legacy fixed behavior (3h / 9am). Prefer automation-aware scheduling."""
    tz_name = user_timezone or "UTC"
    try:
        tz = ZoneInfo(tz_name)
    except Exception:
        tz = ZoneInfo("UTC")

    local = after.astimezone(tz)
    if local.hour >= 17:
        next_local = (local + timedelta(days=1)).replace(hour=9, minute=0, second=0, microsecond=0)
    else:
        next_local = local + timedelta(hours=3)
    return next_local.astimezone(UTC)


def compute_whatsapp_followup_time_for(
    db: Session,
    *,
    user: Profile,
    after: datetime,
) -> datetime:
    from gentletap.services.automation_settings import get_automation_settings, whatsapp_followup_time

    settings = get_automation_settings(db, user.id)
    return whatsapp_followup_time(
        after=after,
        timezone_name=settings.timezone,
        delay_hours=settings.whatsapp_delay_hours,
        quiet_hours=settings.whatsapp_quiet_hours,
    )


def schedule_whatsapp_followup(
    db: Session,
    *,
    user: Profile,
    invoice: Invoice,
    sequence_step: int,
    tone: str | None,
    after: datetime | None = None,
) -> WhatsappFollowupJob | None:
    existing = (
        db.query(WhatsappFollowupJob)
        .filter(
            WhatsappFollowupJob.invoice_id == invoice.id,
            WhatsappFollowupJob.sequence_step == sequence_step,
            WhatsappFollowupJob.status.in_(("pending", "processing")),
        )
        .one_or_none()
    )
    if existing:
        return existing

    base = after or datetime.now(UTC)
    scheduled_for = compute_whatsapp_followup_time_for(db, user=user, after=base)

    job = WhatsappFollowupJob(
        user_id=user.id,
        invoice_id=invoice.id,
        sequence_step=sequence_step,
        tone=tone,
        scheduled_for=scheduled_for,
        status="pending",
    )
    db.add(job)
    return job


def cancel_whatsapp_followups(db: Session, invoice_id: UUID) -> int:
    jobs = (
        db.query(WhatsappFollowupJob)
        .filter(WhatsappFollowupJob.invoice_id == invoice_id, WhatsappFollowupJob.status.in_(("pending", "processing")))
        .all()
    )
    for job in jobs:
        job.status = "cancelled"
    return len(jobs)


def cancel_all_invoice_automation(db: Session, invoice_id: UUID) -> None:
    from gentletap.services.sequences import cancel_invoice_jobs

    cancel_invoice_jobs(db, invoice_id)

"""Lazy reminder-job scheduling: one job per invoice step, materialized on demand.

The job is the dispatch unit: the beat claims due jobs (SKIP LOCKED) and fans
out per-job Celery tasks. Each task materializes the ReminderSchedule row for
its step (if the eager builder has not already) and runs the hardened send
pipeline. After a send, the job advances to the next step spaced by the
natural gap between sequence day-offsets, floored so a long-overdue invoice
is never blasted on consecutive days.
"""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.invoice import Invoice
from app.models.reminder_job import ReminderJob
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence, SequenceAssignment
from app.services.ai.tones import select_tone
from app.services.client_profile import get_or_create_profile
from app.services.reminder_engine import (
    get_or_create_org_settings,
    next_valid_send_time,
    resolve_timezone,
    sync_reminder_job,
)

logger = logging.getLogger(__name__)

STUCK_PROCESSING_MINUTES = 15
MAX_SEND_ATTEMPTS = 5
SEND_RETRY_BACKOFF_MINUTES = 15
MIN_STEP_GAP_DAYS = 2
JOB_DISPATCH_BATCH = 200

RETRYABLE_MARKERS = (
    "429",
    "rate limit",
    "timeout",
    "temporarily",
    "connection",
    "unavailable",
    "503",
    "502",
    "500",
    "timed out",
    "try again",
)


def _next_allowed_window(now, org_settings, best_hour: Optional[int]) -> Optional[datetime]:
    """Apply send_window_days + skip_weekends. Returns next allowed UTC datetime, or None if unconstrained."""
    allowed = org_settings.send_window_days
    if not allowed and not org_settings.skip_weekends:
        return None
    tz = resolve_timezone(org_settings.timezone)
    local = now.astimezone(tz)
    hour = best_hour or 9
    for i in range(0, 8):
        day = local.date() + timedelta(days=i)
        weekday = day.weekday()
        if allowed and weekday not in allowed:
            continue
        if org_settings.skip_weekends and weekday >= 5:
            continue
        candidate = datetime.combine(day, time(hour=hour), tzinfo=tz)
        if i == 0 and candidate <= local:
            continue
        return candidate.astimezone(timezone.utc)
    return None


def effective_steps(sequence: Sequence, client: Optional[Client]) -> List[Tuple[int, int]]:
    """[(step_index, day_offset)] honoring per-client cadence override and enabled flags."""
    steps = sequence.steps or []
    if client and client.cadence_override:
        try:
            override = sorted({int(d) for d in client.cadence_override})
        except (TypeError, ValueError):
            override = None
        if override:
            return list(enumerate(override))
    out: List[Tuple[int, int]] = []
    for idx, step in enumerate(steps):
        if isinstance(step, dict):
            if not step.get("enabled", True):
                continue
            out.append((idx, int(step.get("day_offset", 0))))
        else:
            if not getattr(step, "enabled", True):
                continue
            out.append((idx, int(getattr(step, "day_offset", 0))))
    return out


def _best_send_hour(db: Session, invoice: Invoice) -> Optional[int]:
    try:
        profile = get_or_create_profile(db, invoice.client_id, invoice.org_id)
        prefs = (profile.preferences or {}) if profile else {}
        best = prefs.get("best_send_time")
        if best:
            return int(str(best).split(":")[0])
    except Exception:
        pass
    return None


def _touch_naive(value: Optional[datetime], fallback: datetime) -> datetime:
    if value is None:
        return fallback
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def materialize_step(
    db: Session, invoice: Invoice, sequence: Sequence, step_index: int
) -> Optional[ReminderSchedule]:
    """Return the pending schedule row for a step, creating it on demand.

    Returns None only when a fresh processing row is held by another worker.
    """
    now = datetime.now(timezone.utc)
    pending = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == step_index,
            ReminderSchedule.status == "pending",
        )
        .first()
    )
    if pending is not None:
        return pending

    processing = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == step_index,
            ReminderSchedule.status == "processing",
        )
        .first()
    )
    if processing is not None:
        touched = _touch_naive(processing.updated_at or processing.created_at, now)
        if touched <= now - timedelta(minutes=STUCK_PROCESSING_MINUTES):
            processing.status = "pending"
            db.flush()
            return processing
        return None

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    steps = sequence.steps or []
    step = steps[min(step_index, len(steps) - 1)] if steps else None
    day_offset = 0
    tone: Optional[str] = None
    template_id: Optional[str] = None
    if step is not None:
        if isinstance(step, dict):
            day_offset = int(step.get("day_offset", 0))
            tone = step.get("tone")
            template_id = step.get("template_id")
        else:
            day_offset = int(getattr(step, "day_offset", 0))
            tone = getattr(step, "tone", None)
            template_id = getattr(step, "template_id", None)
    if client and client.cadence_override:
        try:
            override = sorted({int(d) for d in client.cadence_override})
        except (TypeError, ValueError):
            override = None
        if override and step_index < len(override):
            day_offset = override[step_index]

    org_settings = get_or_create_org_settings(db, invoice.org_id)
    if not tone:
        tone_pref = (org_settings.reminder_defaults or {}).get("default_tone")
        tone = select_tone(day_offset, 100, 0, tone_pref)

    best_hour = _best_send_hour(db, invoice)
    base_date = invoice.due_date or date.today()
    naive_local = datetime.combine(
        base_date + timedelta(days=day_offset), time(hour=best_hour or 9)
    )
    scheduled = next_valid_send_time(
        naive_local.replace(tzinfo=resolve_timezone(org_settings.timezone)),
        tz_name=org_settings.timezone,
        best_send_hour=best_hour,
        enabled=org_settings.contact_window_enabled,
    )
    if scheduled < now:
        scheduled = next_valid_send_time(
            now + timedelta(minutes=5),
            tz_name=org_settings.timezone,
            best_send_hour=best_hour,
            enabled=org_settings.contact_window_enabled,
        )

    row = ReminderSchedule(
        invoice_id=invoice.id,
        org_id=invoice.org_id,
        step_index=step_index,
        scheduled_at=scheduled,
        tone=tone,
        template_id=template_id,
        channel="email",
        status="pending",
    )
    db.add(row)
    db.flush()
    return row


def advance_after_send(
    db: Session, invoice: Invoice, sequence: Sequence, sent_step_index: int
) -> Optional[ReminderJob]:
    """Queue the next sequence step using natural-gap spacing (floored)."""
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    steps = effective_steps(sequence, client)
    if not steps:
        return None
    position = next(
        (i for i, (idx, _) in enumerate(steps) if idx == sent_step_index), None
    )
    if position is None or position + 1 >= len(steps):
        return None
    cur_offset = steps[position][1]
    next_step_index, next_offset = steps[position + 1]
    gap_days = max(MIN_STEP_GAP_DAYS, next_offset - cur_offset)

    org_settings = get_or_create_org_settings(db, invoice.org_id)
    best_hour = _best_send_hour(db, invoice)
    scheduled = datetime.now(timezone.utc) + timedelta(days=gap_days)
    scheduled = next_valid_send_time(
        scheduled,
        tz_name=org_settings.timezone,
        best_send_hour=best_hour,
        enabled=org_settings.contact_window_enabled,
    )
    window_next = _next_allowed_window(scheduled, org_settings, best_hour)
    if window_next is not None and window_next > scheduled + timedelta(minutes=15):
        scheduled = window_next

    row = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.step_index == next_step_index,
            ReminderSchedule.status == "pending",
        )
        .first()
    )
    if row is not None:
        row.scheduled_at = scheduled

    return sync_reminder_job(db, invoice, sequence.id, next_step_index, scheduled)


def _backoff_or_fail_job(job: ReminderJob, exc: Optional[Exception]) -> bool:
    """Increment attempts; requeue retryable jobs under the cap, else fail. Returns requeued."""
    job.attempts = (job.attempts or 0) + 1
    if exc is not None:
        job.last_error = str(exc)[:240]
    if job.attempts >= MAX_SEND_ATTEMPTS:
        job.status = "failed"
        return False
    job.status = "pending"
    job.scheduled_for = datetime.now(timezone.utc) + timedelta(
        minutes=SEND_RETRY_BACKOFF_MINUTES * job.attempts
    )
    return True


def reconcile_job_after_processing(
    db: Session,
    job: ReminderJob,
    invoice: Invoice,
    sequence: Optional[Sequence],
    schedule: Optional[ReminderSchedule],
    result: Optional[dict],
) -> None:
    """Mirror the materialized row's outcome onto the owning job."""
    result = result or {}
    if result.get("status") == "sent" or (schedule is not None and schedule.status == "sent"):
        job.status = "sent"
        job.attempts = (schedule.attempts if schedule is not None else 0) or job.attempts
        job.last_error = None
        if sequence is not None:
            advance_after_send(db, invoice, sequence, job.sequence_step)
        return

    if schedule is not None and schedule.status == "pending":
        # Reschedule/retry paths push the row back to pending with a new time.
        job.status = "pending"
        job.scheduled_for = schedule.scheduled_at
        job.attempts = schedule.attempts or 0
        return

    if schedule is None or result.get("reason") == "not_pending":
        _backoff_or_fail_job(job, None)
        db.flush()
        return

    job.attempts = schedule.attempts or job.attempts
    job.last_error = (schedule.skip_reason or schedule.status)[:240]
    job.status = "cancelled" if schedule.status in ("skipped", "cancelled") else "failed"


def execute_job(db: Session, job: ReminderJob) -> dict:
    """Materialize the job's step row and run the hardened send pipeline.

    Owns its rollback/commit on the failure path; the caller commits the
    success path.
    """
    from app.tasks.process_reminders import process_single_reminder  # lazy: avoids import cycle

    invoice = db.query(Invoice).filter(Invoice.id == job.invoice_id).first()
    if invoice is None:
        job.status = "failed"
        job.last_error = "invoice_missing"
        return {"status": "failed", "reason": "invoice_missing"}

    sequence = None
    if job.sequence_id:
        sequence = db.query(Sequence).filter(Sequence.id == job.sequence_id).first()
    if sequence is None:
        assignment = (
            db.query(SequenceAssignment)
            .filter(SequenceAssignment.invoice_id == invoice.id)
            .first()
        )
        if assignment is not None:
            sequence = db.query(Sequence).filter(Sequence.id == assignment.sequence_id).first()
            if sequence is not None and not job.sequence_id:
                job.sequence_id = sequence.id
    if sequence is None:
        job.status = "failed"
        job.last_error = "sequence_missing"
        return {"status": "failed", "reason": "sequence_missing"}

    schedule = materialize_step(db, invoice, sequence, job.sequence_step)
    if schedule is None:
        _backoff_or_fail_job(job, None)
        db.flush()
        return {"status": "retry", "reason": "not_pending", "attempts": job.attempts}

    try:
        result = process_single_reminder(db, schedule)
    except Exception as exc:  # noqa: BLE001 - classify retryability at job level
        db.rollback()
        job = db.query(ReminderJob).filter(ReminderJob.id == job.id).first()
        retryable = any(marker in str(exc).lower() for marker in RETRYABLE_MARKERS)
        if retryable:
            _backoff_or_fail_job(job, exc)
        else:
            job.attempts = (job.attempts or 0) + 1
            job.last_error = str(exc)[:240]
            job.status = "failed"
        db.commit()
        return {"status": "failed", "reason": job.last_error}

    reconcile_job_after_processing(db, job, invoice, sequence, schedule, result)
    return result if result is not None else {}


def claim_due_jobs(db: Session, now: datetime, limit: int = JOB_DISPATCH_BATCH) -> List[str]:
    """Claim due pending jobs (SKIP LOCKED) and mark them processing."""
    jobs = (
        db.query(ReminderJob)
        .filter(ReminderJob.status == "pending", ReminderJob.scheduled_for <= now)
        .order_by(ReminderJob.scheduled_for.asc())
        .with_for_update(skip_locked=True)
        .limit(limit)
        .all()
    )
    ids = [j.id for j in jobs]
    for j in jobs:
        j.status = "processing"
    db.commit()
    return ids


def requeue_stuck_jobs(db: Session, now: datetime, limit: int = 100) -> int:
    """Reset jobs orphaned in 'processing' (worker killed mid-send) back to pending."""
    cutoff = now - timedelta(minutes=STUCK_PROCESSING_MINUTES)
    stuck = (
        db.query(ReminderJob)
        .filter(ReminderJob.status == "processing", ReminderJob.updated_at <= cutoff)
        .order_by(ReminderJob.updated_at.asc())
        .limit(limit)
        .all()
    )
    for job in stuck:
        job.attempts = (job.attempts or 0) + 1
        if job.attempts >= MAX_SEND_ATTEMPTS:
            job.status = "failed"
            job.last_error = "max_attempts_stuck"
        else:
            job.status = "pending"
    if stuck:
        db.commit()
    return len(stuck)

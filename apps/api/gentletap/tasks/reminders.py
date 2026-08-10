import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import update

from gentletap.database import ReminderJob, SessionLocal
from gentletap.scale_limits import REMINDER_DISPATCH_BATCH
from gentletap.services.reminders import process_due_job
from gentletap.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Jobs stuck in "processing" longer than this are presumed orphaned (worker crash) and requeued.
STUCK_JOB_TIMEOUT = timedelta(minutes=15)
# Retryable (transient) failures requeue; after this many attempts the job is failed permanently.
MAX_JOB_ATTEMPTS = 5
_RETRYABLE_MARKERS = (
    "429",
    "rate limit",
    "ratelimit",
    "timeout",
    "timed out",
    "temporarily",
    "temporarily_unavailable",
    "connection",
    "unavailable",
    "503",
    "502",
    "500",
)


def _is_retryable(exc: Exception) -> bool:
    text = str(exc).lower()
    return any(marker in text for marker in _RETRYABLE_MARKERS)


def _handle_job_failure(db, job_id: str, exc: Exception) -> None:
    """Increment attempts; requeue only retryable failures under the cap, else fail."""
    job = db.query(ReminderJob).filter(ReminderJob.id == job_id).one_or_none()
    if job is None:
        return
    job.attempts = (job.attempts or 0) + 1
    job.last_error = str(exc)[:1000]
    if job.status in ("processing", "pending"):
        if _is_retryable(exc) and job.attempts < MAX_JOB_ATTEMPTS:
            job.status = "pending"
        else:
            job.status = "failed"
    db.commit()


def _requeue_stuck_jobs(db) -> int:
    """Reset jobs orphaned in 'processing' (e.g. worker killed mid-send) back to 'pending'."""
    cutoff = datetime.now(UTC) - STUCK_JOB_TIMEOUT
    result = db.execute(
        update(ReminderJob)
        .where(ReminderJob.status == "processing", ReminderJob.updated_at < cutoff)
        .values(status="pending")
    )
    db.commit()
    return result.rowcount or 0


@celery_app.task(name="gentletap.tasks.reminders.evaluate_due_reminders")
def evaluate_due_reminders() -> dict:
    """Lightweight scheduler: claim due jobs and fan out to worker tasks."""
    db = SessionLocal()
    try:
        requeued = _requeue_stuck_jobs(db)
        if requeued:
            logger.warning("Requeued %s stuck reminder job(s)", requeued)
        now = datetime.now(UTC)
        jobs = (
            db.query(ReminderJob)
            .filter(ReminderJob.status == "pending", ReminderJob.scheduled_for <= now)
            .with_for_update(skip_locked=True)
            .limit(REMINDER_DISPATCH_BATCH)
            .all()
        )
        job_ids = [str(job.id) for job in jobs]
        for job in jobs:
            job.status = "processing"
        db.commit()
    finally:
        db.close()

    for job_id in job_ids:
        send_reminder_job.delay(job_id, pre_claimed=True)

    if job_ids:
        logger.info("evaluate_due_reminders dispatched %s job(s)", len(job_ids))
    return {"dispatched": len(job_ids)}


@celery_app.task(name="gentletap.tasks.reminders.send_reminder_job")
def send_reminder_job(job_id: str, *, pre_claimed: bool = False) -> None:
    jid = UUID(job_id)
    db = SessionLocal()
    try:
        if not pre_claimed:
            # Atomically claim: only one of (immediate dispatch, beat poll) may win.
            claimed = db.execute(
                update(ReminderJob)
                .where(ReminderJob.id == jid, ReminderJob.status == "pending")
                .values(status="processing")
            )
            db.commit()
            if (claimed.rowcount or 0) != 1:
                return
        else:
            job = db.query(ReminderJob).filter(ReminderJob.id == jid).one_or_none()
            if job is None or job.status != "processing":
                return
        try:
            process_due_job(db, jid)
        except Exception as exc:
            logger.exception("send_reminder_job failed: %s", job_id)
            _handle_job_failure(db, jid, exc)
    finally:
        db.close()

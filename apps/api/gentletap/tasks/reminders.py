import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import update

from gentletap.database import ReminderJob, SessionLocal
from gentletap.services.reminders import process_due_job
from gentletap.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

# Jobs stuck in "processing" longer than this are presumed orphaned (worker crash) and requeued.
STUCK_JOB_TIMEOUT = timedelta(minutes=15)


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
            .limit(100)
            .all()
        )
        job_ids = [job.id for job in jobs]
        for job in jobs:
            job.status = "processing"
        db.commit()

        processed = 0
        for job_id in job_ids:
            job_db = SessionLocal()
            try:
                process_due_job(job_db, job_id)
                processed += 1
            except Exception:
                logger.exception("Reminder job failed: %s", job_id)
                stuck = job_db.query(ReminderJob).filter(ReminderJob.id == job_id).one_or_none()
                if stuck and stuck.status == "processing":
                    stuck.status = "pending"
                    job_db.commit()
            finally:
                job_db.close()
        if job_ids:
            logger.info("evaluate_due_reminders processed %s/%s jobs", processed, len(job_ids))
        return {"processed": processed, "due": len(job_ids)}
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.reminders.send_reminder_job")
def send_reminder_job(job_id: str) -> None:
    jid = UUID(job_id)
    db = SessionLocal()
    try:
        # Atomically claim the job: only one of (immediate dispatch, beat poll) may win.
        # If rowcount != 1 the job was already claimed elsewhere — do NOT process again.
        claimed = db.execute(
            update(ReminderJob)
            .where(ReminderJob.id == jid, ReminderJob.status == "pending")
            .values(status="processing")
        )
        db.commit()
        if (claimed.rowcount or 0) != 1:
            return
        try:
            process_due_job(db, jid)
        except Exception:
            logger.exception("send_reminder_job failed: %s", job_id)
            stuck = db.query(ReminderJob).filter(ReminderJob.id == jid).one_or_none()
            if stuck and stuck.status == "processing":
                stuck.status = "pending"
                db.commit()
    finally:
        db.close()

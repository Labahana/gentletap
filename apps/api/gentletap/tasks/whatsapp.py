import logging
from datetime import UTC, datetime, timedelta

from sqlalchemy import update

from gentletap.database import SessionLocal, WhatsappFollowupJob
from gentletap.services.whatsapp_followup import process_whatsapp_followup
from gentletap.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)

STUCK_JOB_TIMEOUT = timedelta(minutes=30)


def _requeue_stuck_jobs(db) -> int:
    cutoff = datetime.now(UTC) - STUCK_JOB_TIMEOUT
    result = db.execute(
        update(WhatsappFollowupJob)
        .where(WhatsappFollowupJob.status == "processing", WhatsappFollowupJob.updated_at < cutoff)
        .values(status="pending")
    )
    db.commit()
    return result.rowcount or 0


@celery_app.task(name="gentletap.tasks.whatsapp.evaluate_followups")
def evaluate_whatsapp_followups() -> dict:
    db = SessionLocal()
    try:
        requeued = _requeue_stuck_jobs(db)
        if requeued:
            logger.warning("Requeued %s stuck WhatsApp job(s)", requeued)
        now = datetime.now(UTC)
        jobs = (
            db.query(WhatsappFollowupJob)
            .filter(WhatsappFollowupJob.status == "pending", WhatsappFollowupJob.scheduled_for <= now)
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
                process_whatsapp_followup(job_db, job_id)
                processed += 1
            except Exception:
                logger.exception("WhatsApp follow-up job failed: %s", job_id)
                stuck = job_db.query(WhatsappFollowupJob).filter(WhatsappFollowupJob.id == job_id).one_or_none()
                if stuck and stuck.status == "processing":
                    stuck.status = "pending"
                    job_db.commit()
            finally:
                job_db.close()
        return {"processed": processed}
    finally:
        db.close()

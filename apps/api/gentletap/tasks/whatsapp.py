import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import update

from gentletap.database import SessionLocal, WhatsappFollowupJob
from gentletap.scale_limits import WHATSAPP_DISPATCH_BATCH
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
    """Claim due WhatsApp jobs and fan out to worker tasks."""
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
            .limit(WHATSAPP_DISPATCH_BATCH)
            .all()
        )
        job_ids = [str(job.id) for job in jobs]
        for job in jobs:
            job.status = "processing"
        db.commit()
    finally:
        db.close()

    for job_id in job_ids:
        send_whatsapp_followup_job.delay(job_id, pre_claimed=True)

    return {"dispatched": len(job_ids)}


@celery_app.task(name="gentletap.tasks.whatsapp.send_whatsapp_followup_job")
def send_whatsapp_followup_job(job_id: str, *, pre_claimed: bool = False) -> None:
    jid = UUID(job_id)
    db = SessionLocal()
    try:
        if not pre_claimed:
            claimed = db.execute(
                update(WhatsappFollowupJob)
                .where(WhatsappFollowupJob.id == jid, WhatsappFollowupJob.status == "pending")
                .values(status="processing")
            )
            db.commit()
            if (claimed.rowcount or 0) != 1:
                return
        else:
            job = db.query(WhatsappFollowupJob).filter(WhatsappFollowupJob.id == jid).one_or_none()
            if job is None or job.status != "processing":
                return
        try:
            process_whatsapp_followup(db, jid)
        except Exception:
            logger.exception("send_whatsapp_followup_job failed: %s", job_id)
            stuck = db.query(WhatsappFollowupJob).filter(WhatsappFollowupJob.id == jid).one_or_none()
            if stuck and stuck.status == "processing":
                stuck.status = "pending"
                stuck.error_message = "worker_error"
                db.commit()
    finally:
        db.close()

from datetime import UTC, datetime

from gentletap.database import ReminderJob, SessionLocal, WhatsappFollowupJob
from gentletap.services.reminders import process_due_job
from gentletap.services.whatsapp_followup import process_whatsapp_followup
from gentletap.tasks.celery_app import celery_app


@celery_app.task(name="gentletap.tasks.reminders.evaluate_due_reminders")
def evaluate_due_reminders() -> dict:
    db = SessionLocal()
    try:
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
                stuck = job_db.query(ReminderJob).filter(ReminderJob.id == job_id).one_or_none()
                if stuck and stuck.status == "processing":
                    stuck.status = "pending"
                    job_db.commit()
            finally:
                job_db.close()
        return {"processed": processed}
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.reminders.send_reminder_job")
def send_reminder_job(job_id: str) -> None:
    from uuid import UUID

    db = SessionLocal()
    try:
        job = db.query(ReminderJob).filter(ReminderJob.id == UUID(job_id)).one_or_none()
        if job and job.status == "pending":
            job.status = "processing"
            db.commit()
        process_due_job(db, UUID(job_id))
    finally:
        db.close()

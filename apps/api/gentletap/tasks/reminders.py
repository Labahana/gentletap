from datetime import UTC, datetime

from gentletap.database import ReminderJob, SessionLocal
from gentletap.services.reminders import process_due_job
from gentletap.tasks.celery_app import celery_app


@celery_app.task(name="gentletap.tasks.reminders.evaluate_due_reminders")
def evaluate_due_reminders() -> dict:
    db = SessionLocal()
    try:
        now = datetime.now(UTC)
        jobs = (
            db.query(ReminderJob)
            .filter(ReminderJob.status == "pending", ReminderJob.scheduled_for <= now)
            .limit(100)
            .all()
        )
        sent = 0
        for job in jobs:
            process_due_job(db, job.id)
            sent += 1
        return {"processed": sent}
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.reminders.send_reminder_job")
def send_reminder_job(job_id: str) -> None:
    from uuid import UUID

    db = SessionLocal()
    try:
        process_due_job(db, UUID(job_id))
    finally:
        db.close()

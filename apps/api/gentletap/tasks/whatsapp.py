from datetime import UTC, datetime

from gentletap.database import SessionLocal, WhatsappFollowupJob
from gentletap.services.whatsapp_followup import process_whatsapp_followup
from gentletap.tasks.celery_app import celery_app


@celery_app.task(name="gentletap.tasks.whatsapp.evaluate_followups")
def evaluate_whatsapp_followups() -> dict:
    db = SessionLocal()
    try:
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
                stuck = job_db.query(WhatsappFollowupJob).filter(WhatsappFollowupJob.id == job_id).one_or_none()
                if stuck and stuck.status == "processing":
                    stuck.status = "pending"
                    job_db.commit()
            finally:
                job_db.close()
        return {"processed": processed}
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.whatsapp.poll_registering_senders")
def poll_registering_senders() -> dict:
    from gentletap.database import WhatsappConnection
    from gentletap.integrations.twilio.embedded_signup import activate_connection_if_online

    db = SessionLocal()
    try:
        rows = (
            db.query(WhatsappConnection)
            .filter(
                WhatsappConnection.status == "registering",
                WhatsappConnection.sender_sid.isnot(None),
                WhatsappConnection.disconnected_at.is_(None),
            )
            .limit(50)
            .all()
        )
        activated = 0
        for conn in rows:
            if activate_connection_if_online(db, conn.id):
                activated += 1
        db.commit()
        return {"checked": len(rows), "activated": activated}
    finally:
        db.close()

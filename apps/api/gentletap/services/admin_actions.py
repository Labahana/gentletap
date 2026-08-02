"""Privileged admin write actions — always audited."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import update
from sqlalchemy.orm import Session

from gentletap.database import Invoice, Profile, ReminderJob
from gentletap.services.sequences import cancel_invoice_jobs
from gentletap.tasks.sync import sync_user_freshbooks_invoices, sync_user_invoices

STUCK_JOB_MINUTES = 15


def admin_force_qb_sync(user_id: UUID) -> dict:
    sync_user_invoices.delay(str(user_id))
    return {"status": "queued", "user_id": str(user_id)}


def admin_force_fb_sync(user_id: UUID) -> dict:
    sync_user_freshbooks_invoices.delay(str(user_id))
    return {"status": "queued", "user_id": str(user_id)}


def admin_requeue_job(db: Session, job_id: UUID) -> dict:
    job = db.query(ReminderJob).filter(ReminderJob.id == job_id).one_or_none()
    if job is None:
        return {"status": "not_found"}
    if job.status not in ("failed", "processing", "pending"):
        return {"status": "skipped", "reason": f"job_status_{job.status}"}
    job.status = "pending"
    db.commit()
    return {"status": "requeued", "job_id": str(job_id)}


def admin_requeue_stuck_jobs(db: Session) -> dict:
    cutoff = datetime.now(UTC) - timedelta(minutes=STUCK_JOB_MINUTES)
    result = db.execute(
        update(ReminderJob)
        .where(ReminderJob.status == "processing", ReminderJob.updated_at < cutoff)
        .values(status="pending")
    )
    db.commit()
    return {"requeued": result.rowcount or 0}


def admin_pause_user_reminders(db: Session, user_id: UUID) -> dict:
    user = db.query(Profile).filter(Profile.id == user_id).one_or_none()
    if user is None:
        return {"status": "not_found"}

    invoices = (
        db.query(Invoice)
        .filter(Invoice.user_id == user_id, Invoice.sequence_active.is_(True))
        .all()
    )
    cancelled_jobs = 0
    for inv in invoices:
        inv.sequence_active = False
        inv.sequence_paused = True
        cancelled_jobs += cancel_invoice_jobs(db, inv.id)
    db.commit()
    return {
        "status": "paused",
        "invoices_paused": len(invoices),
        "jobs_cancelled": cancelled_jobs,
    }

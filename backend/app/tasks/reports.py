"""Monthly reports and log cleanup."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.audit_log import AuditLog
from app.models.organization import Organization
from app.models.user import User
from app.services.email import send_email_via_resend
from app.services.reporting import build_monthly_report
from app.services.redis_lock import redis_lock
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.reports.generate_monthly_report_task")
def generate_monthly_report_task(org_id: str):
    with redis_lock(f"monthly_report:{org_id}", ttl_seconds=3600) as acquired:
        if not acquired:
            return {"status": "skipped", "reason": "locked"}

        db = SessionLocal()
        try:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return {"status": "error", "reason": "org_not_found"}
            report = build_monthly_report(db, org_id)
            owner = db.query(User).filter(User.id == org.owner_user_id).first()
            if owner and owner.email:
                subject = f"GentleTap monthly report — {report['period']}"
                body = (
                    f"Hi,\n\n"
                    f"Monthly summary for {org.name} ({report['period']}):\n\n"
                    f"• Total collected: ${report['total_collected']:,.2f}\n"
                    f"• Reminders sent: {report['reminders_sent']}\n"
                    f"• Open rate: {report['open_rate']*100:.1f}%\n"
                    f"• Est. time saved: {report['time_saved_hours']} hours\n\n"
                    f"— GentleTap"
                )
                send_email_via_resend(owner.email, subject, body)

            db.add(
                AuditLog(
                    org_id=org_id,
                    actor_type="system",
                    action="monthly_report_generated",
                    entity_type="organization",
                    entity_id=org_id,
                    details=report,
                )
            )
            db.commit()
            return {"status": "ok", "report": report}
        except Exception:
            db.rollback()
            raise
        finally:
            db.close()


@celery_app.task(name="app.tasks.reports.generate_all_monthly_reports")
def generate_all_monthly_reports():
    db = SessionLocal()
    try:
        ids = [o.id for o in db.query(Organization).all()]
    finally:
        db.close()
    for oid in ids:
        generate_monthly_report_task.delay(oid)
    return {"enqueued": len(ids)}


@celery_app.task(name="app.tasks.reports.cleanup_old_logs_task")
def cleanup_old_logs_task():
    """Remove audit logs older than 180 days (temp retention)."""
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=180)
        deleted = (
            db.query(AuditLog)
            .filter(AuditLog.created_at < cutoff)
            .delete(synchronize_session=False)
        )
        db.commit()
        return {"deleted": deleted}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

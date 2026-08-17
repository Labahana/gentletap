"""Billing Celery tasks — grace period downgrade, deletion purge."""

from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models.organization import Organization
from app.models.subscription import Subscription
from app.models.user import User
from app.models.client import Client
from app.models.audit_log import AuditLog
from app.services.email import send_email_via_resend
from app.services.plan_gating import apply_plan_quotas
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.billing_tasks.process_past_due_grace")
def process_past_due_grace():
    """After 7 days past_due, downgrade to starter."""
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        subs = (
            db.query(Subscription)
            .filter(Subscription.status == "past_due", Subscription.past_due_since.isnot(None))
            .all()
        )
        downgraded = 0
        for sub in subs:
            if sub.past_due_since and sub.past_due_since <= cutoff:
                org = db.query(Organization).filter(Organization.id == sub.org_id).first()
                if not org:
                    continue
                org.plan = "starter"
                apply_plan_quotas(org)
                sub.status = "cancelled"
                sub.plan = "starter"
                owner = db.query(User).filter(User.id == org.owner_user_id).first()
                if owner and owner.email:
                    send_email_via_resend(
                        owner.email,
                        "GentleTap plan downgraded to Starter",
                        f"Hi,\n\nPayment for {org.name} remained past due for 7 days. "
                        f"Your plan has been moved to Starter. Update billing to restore Pro features.\n\n— GentleTap",
                    )
                downgraded += 1
        db.commit()
        return {"downgraded": downgraded}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.billing_tasks.purge_deleted_accounts")
def purge_deleted_accounts():
    """Hard-delete orgs past 30-day GDPR grace."""
    db = SessionLocal()
    try:
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)
        orgs = (
            db.query(Organization)
            .filter(Organization.deletion_requested_at.isnot(None), Organization.deletion_requested_at <= cutoff)
            .all()
        )
        purged = 0
        for org in orgs:
            # Anonymize audit logs
            logs = db.query(AuditLog).filter(AuditLog.org_id == org.id).all()
            for log in logs:
                log.details = {"anonymized": True, "action": log.action}
                log.ip = None
            # Mask clients
            for c in db.query(Client).filter(Client.org_id == org.id).all():
                c.email = None
                c.phone = None
                c.name = "Deleted Client"
                c.address = None
            owner = db.query(User).filter(User.id == org.owner_user_id).first()
            if owner:
                owner.email = f"deleted_{owner.id[:8]}@purged.local"
                owner.full_name = "Deleted User"
                owner.is_deleting = False
            org.name = "Deleted Organization"
            org.paddle_customer_id = None
            org.paddle_subscription_id = None
            org.deletion_requested_at = None
            purged += 1
        db.commit()
        return {"purged": purged}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


@celery_app.task(name="app.tasks.billing_tasks.export_org_data_task")
def export_org_data_task(org_id: str, email: str):
    """Gather org data and email a summary download (JSON payload in email for Phase 3)."""
    import json

    db = SessionLocal()
    try:
        from app.models.invoice import Invoice
        from app.models.message import Message
        from app.models.sequence import Sequence
        from app.models.template import Template

        payload = {
            "org_id": org_id,
            "exported_at": datetime.now(timezone.utc).isoformat(),
            "clients": [
                {"id": c.id, "name": c.name, "email": c.email}
                for c in db.query(Client).filter(Client.org_id == org_id).all()
            ],
            "invoices": [
                {"id": i.id, "number": i.number, "amount": float(i.amount), "status": i.status}
                for i in db.query(Invoice).filter(Invoice.org_id == org_id).all()
            ],
            "messages_count": db.query(Message).filter(Message.org_id == org_id).count(),
            "sequences": [
                {"id": s.id, "name": s.name} for s in db.query(Sequence).filter(Sequence.org_id == org_id).all()
            ],
            "templates": [
                {"id": t.id, "name": t.name, "tone": t.tone}
                for t in db.query(Template).filter(Template.org_id == org_id).all()
            ],
        }
        body = (
            f"Your GentleTap data export is ready.\n\n"
            f"Summary JSON (save this file):\n\n{json.dumps(payload, indent=2)[:50000]}\n\n"
            f"This export link is valid conceptually for 7 days.\n\n— GentleTap"
        )
        send_email_via_resend(email, "Your GentleTap data export", body)
        return {"status": "ok", "org_id": org_id}
    finally:
        db.close()

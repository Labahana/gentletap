"""Daily digest emails per organization timezone."""

from __future__ import annotations

import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from app.database import SessionLocal
from app.models.organization import Organization
from app.models.org_settings import OrgSettings
from app.models.user import User
from app.services.email import send_email_via_resend
from app.services.reminder_engine import get_or_create_org_settings, resolve_timezone
from app.services.reporting import build_daily_digest, format_digest_email
from app.services.redis_lock import redis_lock
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.digests.send_daily_digest_task")
def send_daily_digest_task(org_id: str):
    with redis_lock(f"digest:{org_id}", ttl_seconds=3600) as acquired:
        if not acquired:
            return {"status": "skipped", "reason": "locked"}

        db = SessionLocal()
        try:
            org = db.query(Organization).filter(Organization.id == org_id).first()
            if not org:
                return {"status": "error", "reason": "org_not_found"}
            settings_row = get_or_create_org_settings(db, org_id)
            if not settings_row.daily_digest:
                return {"status": "skipped", "reason": "disabled"}

            owner = db.query(User).filter(User.id == org.owner_user_id).first()
            if not owner or not owner.email:
                return {"status": "skipped", "reason": "no_owner_email"}

            digest = build_daily_digest(db, org_id)
            subject, body = format_digest_email(org.name, digest)
            send_email_via_resend(owner.email, subject, body)
            return {"status": "ok", "org_id": org_id, "digest": digest}
        except Exception as exc:
            logger.exception("send_daily_digest_task failed: %s", exc)
            raise
        finally:
            db.close()


@celery_app.task(name="app.tasks.digests.send_all_daily_digests")
def send_all_daily_digests():
    """Run hourly; send only for orgs whose local time is currently 8:00–8:59."""
    db = SessionLocal()
    enqueued = 0
    try:
        orgs = db.query(Organization).all()
        for org in orgs:
            settings_row = get_or_create_org_settings(db, org.id)
            if not settings_row.daily_digest:
                continue
            tz = resolve_timezone(settings_row.timezone)
            local_now = datetime.now(tz)
            if local_now.hour != 8:
                continue
            send_daily_digest_task.delay(org.id)
            enqueued += 1
        db.commit()
        return {"enqueued": enqueued}
    finally:
        db.close()

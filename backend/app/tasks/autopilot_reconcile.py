"""Provider-agnostic autopilot reconciler.

The accounting sync loop only auto-assigns sequences to invoices that carry a
connection_id, so manually-created / CSV-imported invoices and Gmail-only orgs
were never chased by autopilot. This task is the backstop that closes that gap.
"""

from __future__ import annotations

import logging

from app.database import SessionLocal
from app.services.redis_lock import redis_lock
from app.services.reminder_engine import autopilot_reconcile_all
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.autopilot_reconcile.autopilot_reconcile_task")
def autopilot_reconcile_task():
    with redis_lock("autopilot:reconcile", ttl_seconds=280) as acquired:
        if not acquired:
            return {"status": "skipped", "reason": "locked"}
        db = SessionLocal()
        try:
            result = autopilot_reconcile_all(db)
            if result.get("assigned"):
                logger.info("autopilot reconciler assigned %s invoices", result["assigned"])
            return {"status": "ok", **result}
        except Exception as exc:
            db.rollback()
            logger.exception("autopilot_reconcile_task failed: %s", exc)
            raise
        finally:
            db.close()

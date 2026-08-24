"""Weekly client re-profiling (payment-history stats refresh)."""

from __future__ import annotations

import logging

from app.database import SessionLocal
from app.models.organization import Organization
from app.intelligence.profiler import reprofile_org_clients
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.profile_refresh.reprofile_all_orgs")
def reprofile_all_orgs():
    """Recompute ClientProfile stats for every org from local invoice history."""
    db = SessionLocal()
    try:
        org_ids = [o.id for o in db.query(Organization.id).all()]
        total_clients = 0
        for org_id in org_ids:
            try:
                total_clients += reprofile_org_clients(db, str(org_id))
            except Exception as exc:  # noqa: BLE001 - one bad org must not stop the rest
                db.rollback()
                logger.warning("Reprofiling org %s failed: %s", org_id, exc)
        logger.info("Weekly reprofile complete: %s orgs, %s clients", len(org_ids), total_clients)
        return {"orgs": len(org_ids), "clients": total_clients}
    finally:
        db.close()

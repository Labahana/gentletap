"""Sync unpaid invoices from accounting connections."""

from __future__ import annotations

import logging
from datetime import datetime, timezone

from app.database import SessionLocal
from app.models.connection import Connection
from app.models.invoice import Invoice
from app.models.org_settings import OrgSettings
from app.models.sequence import Sequence
from app.services.redis_lock import redis_lock
from app.services.reminder_engine import assign_sequence_and_schedule, get_or_create_org_settings
from app.services.payment_detect import detect_and_stop_if_paid
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.sync_invoices.sync_invoices_task", bind=True)
def sync_invoices_task(self, connection_id: str):
    with redis_lock(f"sync:{connection_id}", ttl_seconds=600) as acquired:
        if not acquired:
            return {"status": "skipped", "reason": "locked"}

        db = SessionLocal()
        try:
            conn = db.query(Connection).filter(Connection.id == connection_id).first()
            if not conn:
                return {"status": "error", "reason": "connection_not_found"}

            # Provider-specific pull is stubbed for Phase 2; refresh local unpaid balances
            # and apply autopilot assignment / payment detection on existing rows.
            invoices = (
                db.query(Invoice)
                .filter(
                    Invoice.org_id == conn.org_id,
                    Invoice.connection_id == connection_id,
                    Invoice.status.in_(["unpaid", "chasing"]),
                )
                .all()
            )

            org_settings = get_or_create_org_settings(db, conn.org_id)
            default_seq = (
                db.query(Sequence)
                .filter(
                    Sequence.org_id == conn.org_id,
                    Sequence.is_default.is_(True),
                    Sequence.status == "active",
                )
                .first()
            )

            stopped = 0
            assigned = 0
            for inv in invoices:
                result = detect_and_stop_if_paid(db, inv, method="sync")
                if result:
                    stopped += 1
                    continue

                if (
                    org_settings.operation_mode == "autopilot"
                    and default_seq
                    and default_seq.auto_assign
                    and inv.status in ("unpaid", "chasing")
                ):
                    from app.models.sequence import SequenceAssignment

                    existing = (
                        db.query(SequenceAssignment)
                        .filter(SequenceAssignment.invoice_id == inv.id)
                        .first()
                    )
                    if not existing:
                        assign_sequence_and_schedule(db, inv, default_seq)
                        assigned += 1

            conn.last_sync_at = datetime.now(timezone.utc)
            db.commit()
            return {
                "status": "ok",
                "connection_id": connection_id,
                "checked": len(invoices),
                "stopped": stopped,
                "assigned": assigned,
            }
        except Exception as exc:
            db.rollback()
            logger.exception("sync_invoices_task failed: %s", exc)
            raise
        finally:
            db.close()


@celery_app.task(name="app.tasks.sync_invoices.sync_all_connections")
def sync_all_connections():
    db = SessionLocal()
    try:
        connections = db.query(Connection).filter(Connection.status == "active").all()
        # Fallback: any connection if status column differs
        if not connections:
            connections = db.query(Connection).all()
        ids = [c.id for c in connections]
    finally:
        db.close()

    for i, cid in enumerate(ids):
        # Stagger by 5 minutes via countdown
        sync_invoices_task.apply_async(args=[cid], countdown=i * 300)
    return {"enqueued": len(ids)}

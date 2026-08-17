"""Scheduled payment detection across chasing/unpaid invoices."""

from __future__ import annotations

import logging

from app.database import SessionLocal
from app.models.invoice import Invoice
from app.services.payment_detect import detect_and_stop_if_paid
from app.services.redis_lock import redis_lock
from app.workers.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="app.tasks.payment_detect.payment_detect_task")
def payment_detect_task():
    with redis_lock("payment_detect:global", ttl_seconds=600) as acquired:
        if not acquired:
            return {"status": "skipped", "reason": "locked"}

        db = SessionLocal()
        stopped = []
        try:
            invoices = (
                db.query(Invoice)
                .filter(Invoice.status.in_(["unpaid", "chasing"]))
                .limit(500)
                .all()
            )
            for inv in invoices:
                result = detect_and_stop_if_paid(db, inv, method="scheduled_detect")
                if result:
                    stopped.append(result["invoice_id"])
            db.commit()
            return {"status": "ok", "checked": len(invoices), "stopped": stopped}
        except Exception as exc:
            db.rollback()
            logger.exception("payment_detect_task failed: %s", exc)
            raise
        finally:
            db.close()


@celery_app.task(name="app.tasks.payment_detect.payment_detect_invoice_task")
def payment_detect_invoice_task(invoice_id: str):
    db = SessionLocal()
    try:
        inv = db.query(Invoice).filter(Invoice.id == invoice_id).first()
        if not inv:
            return {"status": "error", "reason": "not_found"}
        result = detect_and_stop_if_paid(db, inv, method="webhook")
        db.commit()
        return {"status": "ok", "result": result}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

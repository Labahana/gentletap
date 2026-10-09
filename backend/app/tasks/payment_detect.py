"""Scheduled payment detection across chasing/unpaid invoices."""

from __future__ import annotations

import logging

from app.database import SessionLocal
from app.models.invoice import Invoice
from app.services.payment_detect import detect_and_stop_if_paid, refresh_invoice_from_provider
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
            from app.services.redis_lock import get_redis

            base = db.query(Invoice).filter(Invoice.status.in_(["unpaid", "chasing"]))
            total = base.count()
            page = 500
            # Round-robin the 500-row window across runs so orgs with >500
            # unpaid invoices aren't starved by an unordered LIMIT that keeps
            # re-checking the same first page.
            try:
                r = get_redis()
                offset = int(r.get("payment_detect:offset") or 0)
            except Exception:  # noqa: BLE001 - fall back to head-of-set
                r = None
                offset = 0
            if total <= page or offset >= total:
                offset = 0
            invoices = (
                base.order_by(Invoice.created_at.asc(), Invoice.id.asc())
                .offset(offset)
                .limit(page)
                .all()
            )
            for inv in invoices:
                result = detect_and_stop_if_paid(db, inv, method="scheduled_detect")
                if result:
                    stopped.append(result["invoice_id"])
            db.commit()
            if r is not None:
                try:
                    r.set("payment_detect:offset", offset + page, ex=3600)
                except Exception:  # noqa: BLE001
                    pass
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
        # Webhook-triggered: the payload proved nothing about the balance, so re-read
        # the invoice from the provider. Only CSV/manual rows fall back to local state.
        result = refresh_invoice_from_provider(db, inv, method="webhook")
        if result is None:
            result = detect_and_stop_if_paid(db, inv, method="webhook")
        db.commit()
        return {"status": "ok", "result": result}
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

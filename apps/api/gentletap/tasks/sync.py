import logging
from uuid import UUID

from gentletap.database import SessionLocal
from gentletap.integrations.quickbooks.sync import sync_unpaid_invoices
from gentletap.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="gentletap.tasks.sync.sync_user_invoices")
def sync_user_invoices(user_id: str) -> dict:
    db = SessionLocal()
    try:
        return sync_unpaid_invoices(db, UUID(user_id))
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.sync.sync_all_users")
def sync_all_users() -> dict:
    from gentletap.database import QuickBooksConnection

    db = SessionLocal()
    try:
        connections = (
            db.query(QuickBooksConnection)
            .filter(QuickBooksConnection.disconnected_at.is_(None))
            .all()
        )
        count = 0
        errors = 0
        for conn in connections:
            try:
                sync_unpaid_invoices(db, conn.user_id)
                count += 1
            except Exception:
                logger.exception("QB sync failed for user %s", conn.user_id)
                errors += 1
        result = {"synced_users": count, "errors": errors, "total_connections": len(connections)}
        logger.info("sync_all_users complete: %s", result)
        return result
    finally:
        db.close()

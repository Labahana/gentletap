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
        user_ids = [
            row[0]
            for row in db.query(QuickBooksConnection.user_id)
            .filter(QuickBooksConnection.disconnected_at.is_(None))
            .all()
        ]
    finally:
        db.close()

    count = 0
    errors = 0
    for user_id in user_ids:
        # Isolated session per user so one failure can't poison the others' transactions.
        user_db = SessionLocal()
        try:
            sync_unpaid_invoices(user_db, user_id)
            count += 1
        except Exception:
            logger.exception("QB sync failed for user %s", user_id)
            errors += 1
        finally:
            user_db.close()

    result = {"synced_users": count, "errors": errors, "total_connections": len(user_ids)}
    logger.info("sync_all_users complete: %s", result)
    return result

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
    """Dispatcher: enqueue one sync task per connected QuickBooks user."""
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

    for user_id in user_ids:
        sync_user_invoices.delay(str(user_id))

    result = {"dispatched_users": len(user_ids)}
    logger.info("sync_all_users complete: %s", result)
    return result

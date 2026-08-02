import logging
from uuid import UUID

from gentletap.database import SessionLocal
from gentletap.integrations.freshbooks.sync import sync_unpaid_invoices as sync_fb_unpaid
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


@celery_app.task(name="gentletap.tasks.sync.sync_user_freshbooks_invoices")
def sync_user_freshbooks_invoices(user_id: str) -> dict:
    db = SessionLocal()
    try:
        return sync_fb_unpaid(db, UUID(user_id))
    finally:
        db.close()


@celery_app.task(name="gentletap.tasks.sync.sync_all_users")
def sync_all_users() -> dict:
    """Dispatcher: enqueue sync tasks for connected QuickBooks and FreshBooks users."""
    from gentletap.database import FreshBooksConnection, QuickBooksConnection

    db = SessionLocal()
    try:
        qb_ids = [
            row[0]
            for row in db.query(QuickBooksConnection.user_id)
            .filter(QuickBooksConnection.disconnected_at.is_(None))
            .all()
        ]
        fb_ids = [
            row[0]
            for row in db.query(FreshBooksConnection.user_id)
            .filter(FreshBooksConnection.disconnected_at.is_(None))
            .all()
        ]
    finally:
        db.close()

    for user_id in qb_ids:
        sync_user_invoices.delay(str(user_id))
    for user_id in fb_ids:
        sync_user_freshbooks_invoices.delay(str(user_id))

    result = {
        "dispatched_quickbooks": len(qb_ids),
        "dispatched_freshbooks": len(fb_ids),
        "dispatched_users": len(qb_ids) + len(fb_ids),
    }
    logger.info("sync_all_users complete: %s", result)
    return result

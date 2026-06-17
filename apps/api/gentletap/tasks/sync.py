from uuid import UUID

from gentletap.database import SessionLocal
from gentletap.integrations.quickbooks.sync import sync_unpaid_invoices
from gentletap.tasks.celery_app import celery_app


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
        for conn in connections:
            sync_unpaid_invoices(db, conn.user_id)
            count += 1
        return {"synced_users": count}
    finally:
        db.close()

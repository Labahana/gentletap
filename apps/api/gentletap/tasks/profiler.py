import logging
from uuid import UUID

from sqlalchemy import not_

from gentletap.database import Client, SessionLocal
from gentletap.intelligence.profiler import profile_client
from gentletap.scale_limits import PROFILE_CLIENT_BATCH
from gentletap.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="gentletap.tasks.profiler.reprofile_user_clients")
def reprofile_user_clients(user_id: str, offset: int = 0) -> dict:
    """Reprofile QB clients in small batches to respect Intuit API rate limits."""
    uid = UUID(user_id)
    db = SessionLocal()
    try:
        clients = (
            db.query(Client)
            .filter(
                Client.user_id == uid,
                Client.qb_customer_id.isnot(None),
                not_(Client.qb_customer_id.like("csv:%")),
            )
            .order_by(Client.id)
            .offset(offset)
            .limit(PROFILE_CLIENT_BATCH)
            .all()
        )
        for client in clients:
            try:
                profile_client(db, client)
            except Exception:
                logger.exception("Failed to profile client %s", client.id)
        db.commit()
        processed = len(clients)
        if processed == PROFILE_CLIENT_BATCH:
            reprofile_user_clients.delay(user_id, offset + PROFILE_CLIENT_BATCH)
        return {"processed": processed, "offset": offset}
    finally:
        db.close()

from datetime import UTC, datetime
from uuid import uuid4

from celery import Celery

from gentletap.config import get_settings

settings = get_settings()

celery_app = Celery(
    "gentletap",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="gentletap.ping")
def ping() -> dict:
    return {"status": "pong", "at": datetime.now(UTC).isoformat(), "id": str(uuid4())}

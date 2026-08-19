"""Celery application initialization."""

from celery import Celery
from celery.schedules import crontab

from app.config import get_settings
from app.workers.beat_schedule import BEAT_SCHEDULE

settings = get_settings()

celery_app = Celery(
    "gentletap",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.sync_invoices",
        "app.tasks.process_reminders",
        "app.tasks.draft_message",
        "app.tasks.send_email",
        "app.tasks.payment_detect",
        "app.tasks.digests",
        "app.tasks.reports",
        "app.tasks.handle_opt_out",
        "app.tasks.billing_tasks",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_track_started=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    broker_connection_retry_on_startup=True,
    task_soft_time_limit=600,
    task_time_limit=900,
    beat_schedule_filename="/var/lib/celery/celerybeat-schedule",
    beat_schedule=BEAT_SCHEDULE,
)

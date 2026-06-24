from celery import Celery
from celery.schedules import crontab

from gentletap.config import get_settings

settings = get_settings()

celery_app = Celery(
    "gentletap",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "gentletap.tasks.sync",
        "gentletap.tasks.reminders",
        "gentletap.tasks.tokens",
        "gentletap.tasks.whatsapp",
        "gentletap.tasks.activation",
        "gentletap.tasks.profiler",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    result_expires=3600,
    broker_connection_retry_on_startup=True,
    task_soft_time_limit=600,
    task_time_limit=900,
    beat_schedule_filename="/var/lib/celery/celerybeat-schedule",
    beat_schedule={
        "refresh-qb-tokens": {
            "task": "gentletap.tasks.tokens.refresh_qb_tokens",
            "schedule": crontab(hour=3, minute=0),
        },
        "refresh-google-tokens": {
            "task": "gentletap.tasks.tokens.refresh_google_tokens",
            "schedule": crontab(hour=3, minute=30),
        },
        "sync-qb-cdc": {
            "task": "gentletap.tasks.sync.sync_all_users",
            "schedule": crontab(minute="*/30"),
            "options": {"expires": 25 * 60},
        },
        "evaluate-reminders": {
            "task": "gentletap.tasks.reminders.evaluate_due_reminders",
            "schedule": crontab(minute="*/5"),
            "options": {"expires": 4 * 60},
        },
        "evaluate-whatsapp-followups": {
            "task": "gentletap.tasks.whatsapp.evaluate_followups",
            "schedule": crontab(minute="*/15"),
            "options": {"expires": 14 * 60},
        },
    },
)

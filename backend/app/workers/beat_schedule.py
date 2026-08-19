"""Celery Beat cron definitions (UTC; tasks convert to org/client timezone)."""

from celery.schedules import crontab

BEAT_SCHEDULE = {
    "refresh-qb-tokens": {
        "task": "app.tasks.token_refresh.refresh_qb_tokens",
        "schedule": crontab(hour=3, minute=0),
    },
    "refresh-fb-tokens": {
        "task": "app.tasks.token_refresh.refresh_fb_tokens",
        "schedule": crontab(minute="*/30"),
        "options": {"expires": 25 * 60},
    },
    "refresh-google-tokens": {
        "task": "app.tasks.token_refresh.refresh_google_tokens",
        "schedule": crontab(hour=3, minute=30),
    },
    "sync-invoices-hourly": {
        "task": "app.tasks.sync_invoices.sync_all_connections",
        "schedule": crontab(minute=0),  # every hour
    },
    "process-reminders-every-15m": {
        "task": "app.tasks.process_reminders.process_reminders_task",
        "schedule": 900.0,  # 15 minutes
        "options": {"expires": 14 * 60},
    },
    "payment-detect-every-15m": {
        "task": "app.tasks.payment_detect.payment_detect_task",
        "schedule": 900.0,
        "options": {"expires": 14 * 60},
    },
    "send-daily-digests": {
        "task": "app.tasks.digests.send_all_daily_digests",
        "schedule": crontab(minute=0, hour="*"),  # hourly; task filters by org local 8am
    },
    "generate-monthly-reports": {
        "task": "app.tasks.reports.generate_all_monthly_reports",
        "schedule": crontab(minute=0, hour=9, day_of_month=1),
    },
    "cleanup-old-logs": {
        "task": "app.tasks.reports.cleanup_old_logs_task",
        "schedule": crontab(minute=0, hour=3),
    },
    "past-due-grace-daily": {
        "task": "app.tasks.billing_tasks.process_past_due_grace",
        "schedule": crontab(minute=30, hour=6),
    },
    "purge-deleted-accounts-daily": {
        "task": "app.tasks.billing_tasks.purge_deleted_accounts",
        "schedule": crontab(minute=0, hour=4),
    },
}

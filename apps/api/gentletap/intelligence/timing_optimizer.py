from datetime import UTC, datetime, timedelta

from gentletap.intelligence.schemas import ReminderContext


def next_send_window(ctx: ReminderContext) -> datetime:
    """Next Tue–Thu 10:00 UTC send window."""
    now = datetime.now(UTC)
    candidate = now + timedelta(hours=1)
    while candidate.weekday() not in (1, 2, 3):
        candidate += timedelta(days=1)
    return candidate.replace(hour=10, minute=0, second=0, microsecond=0)

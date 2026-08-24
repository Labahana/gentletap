"""Pick a considerate send time for reminders.

Step 0 (first reminder after go-live) always fires immediately so users see value
right away. Follow-up steps (1+) respect the sender's local business hours — no
weekend or middle-of-the-night emails — which reads as human, not robotic, and
tends to land better. Spacing *between* steps is handled in sequences.py; this only
shifts a due send forward to the next acceptable window.
"""

from datetime import UTC, datetime, time, timedelta
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.intelligence.schemas import ReminderContext

SEND_WINDOW_START = time(8, 0)  # 08:00 local
SEND_WINDOW_END = time(18, 0)  # 18:00 local (exclusive)
_WEEKEND = {5, 6}  # Saturday, Sunday


def _business_zone(name: str) -> ZoneInfo:
    try:
        return ZoneInfo(name)
    except (ZoneInfoNotFoundError, ValueError):
        return ZoneInfo("UTC")


def _in_send_window(local_dt: datetime) -> bool:
    return (
        local_dt.weekday() not in _WEEKEND
        and SEND_WINDOW_START <= local_dt.time() < SEND_WINDOW_END
    )


def _next_window_start(local_now: datetime) -> datetime:
    """Return the next moment within the business send window (in local tz)."""
    candidate = local_now
    # Bounded loop: a weekend is at most 2 days, so this resolves within a few steps.
    for _ in range(8):
        if _in_send_window(candidate):
            return candidate
        # Before today's window on a weekday -> jump to today's opening time.
        if candidate.weekday() not in _WEEKEND and candidate.time() < SEND_WINDOW_START:
            return candidate.replace(
                hour=SEND_WINDOW_START.hour,
                minute=SEND_WINDOW_START.minute,
                second=0,
                microsecond=0,
            )
        # Otherwise advance to the start of the next day's window.
        candidate = (candidate + timedelta(days=1)).replace(
            hour=SEND_WINDOW_START.hour,
            minute=SEND_WINDOW_START.minute,
            second=0,
            microsecond=0,
        )
    return candidate


def next_send_window(ctx: ReminderContext, *, now: datetime | None = None) -> datetime:
    now = now or datetime.now(UTC)
    if now.tzinfo is None:
        now = now.replace(tzinfo=UTC)

    # First reminder: immediate, any time — users just went live and want to see it work.
    if ctx.invoice.sequence_step <= 0:
        return now

    zone = _business_zone(ctx.business_timezone)
    local_now = now.astimezone(zone)
    local_send = _next_window_start(local_now)
    return local_send.astimezone(UTC)

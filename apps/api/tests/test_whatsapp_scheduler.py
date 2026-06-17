from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from gentletap.services.whatsapp_scheduler import compute_whatsapp_followup_time


def test_whatsapp_followup_same_day_before_5pm():
    # 10am New York -> +3h same day
    after = datetime(2026, 6, 16, 14, 0, tzinfo=UTC)  # 10am EDT
    scheduled = compute_whatsapp_followup_time(after=after, user_timezone="America/New_York")
    local = scheduled.astimezone(ZoneInfo("America/New_York"))
    assert local.date() == datetime(2026, 6, 16).date()
    assert local.hour == 13


def test_whatsapp_followup_next_morning_after_5pm():
    after = datetime(2026, 6, 16, 22, 0, tzinfo=UTC)  # 6pm EDT
    scheduled = compute_whatsapp_followup_time(after=after, user_timezone="America/New_York")
    local = scheduled.astimezone(ZoneInfo("America/New_York"))
    assert local.date() == datetime(2026, 6, 17).date()
    assert local.hour == 9

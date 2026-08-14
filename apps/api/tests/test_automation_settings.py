"""Unit tests for the control-center automation settings service."""

from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from gentletap.services.automation_settings import (
    default_cadence,
    default_quiet_hours,
    default_send_window,
    is_paused,
    next_send_time,
    normalize_cadence,
    whatsapp_followup_time,
)


class _Settings:
    def __init__(self, pause_all: bool, pause_until=None):
        self.pause_all = pause_all
        self.pause_until = pause_until


def test_default_cadence_shape():
    cad = default_cadence()
    assert [s["day_offset"] for s in cad["steps"]] == [0, 3, 7, 14, 21]
    assert all(s["channel"] == "email" for s in cad["steps"])
    assert cad["pre_due_enabled"] is False
    assert cad["thank_you_on_payment"] is False


def test_normalize_cadence_rejects_invalid():
    assert normalize_cadence(None)["steps"] == default_cadence()["steps"]
    assert normalize_cadence({})["steps"] == default_cadence()["steps"]
    assert normalize_cadence({"steps": "nope"})["steps"] == default_cadence()["steps"]


def test_normalize_cadence_sorts_and_sanitizes():
    raw = {
        "steps": [
            {"day_offset": 7, "channel": "whatsapp", "tone": "firm"},
            {"day_offset": 0, "channel": "bogus", "tone": "nope"},
        ],
        "thank_you_on_payment": True,
    }
    cad = normalize_cadence(raw)
    assert [s["day_offset"] for s in cad["steps"]] == [0, 7]
    assert cad["steps"][0]["channel"] == "email"  # bogus -> default
    assert cad["steps"][0]["tone"] is None
    assert cad["steps"][1]["channel"] == "whatsapp"
    assert cad["thank_you_on_payment"] is True


def test_is_paused_indefinite_and_until():
    assert is_paused(_Settings(True)) is True
    assert is_paused(_Settings(False)) is False
    future = datetime.now(UTC).replace(year=2999)
    past = datetime(2020, 1, 1, tzinfo=UTC)
    assert is_paused(_Settings(True, future)) is True
    assert is_paused(_Settings(True, past)) is False


def test_next_send_time_respects_window_and_weekend():
    # Friday 2026-08-14 23:00 UTC = 19:00 New York (after 18:00 window end, before weekend)
    now = datetime(2026, 8, 14, 23, 0, tzinfo=UTC)
    nxt = next_send_time(
        now_utc=now,
        timezone_name="America/New_York",
        send_window=default_send_window(),  # 8-18 Mon-Fri
        skip_weekends=True,
    )
    local = nxt.astimezone(ZoneInfo("America/New_York"))
    assert local.weekday() == 0  # Monday
    assert local.hour == 8


def test_next_send_time_same_day_inside_window():
    now = datetime(2026, 8, 12, 13, 0, tzinfo=UTC)  # Wed 9am New York
    nxt = next_send_time(
        now_utc=now,
        timezone_name="America/New_York",
        send_window=default_send_window(),
        skip_weekends=True,
    )
    local = nxt.astimezone(ZoneInfo("America/New_York"))
    assert local.date() == datetime(2026, 8, 12).date()
    assert local.hour == 9


def test_whatsapp_followup_nudges_out_of_quiet_hours():
    # 20:00 New York + 3h = 23:00 -> inside quiet (21-8) -> next 8am
    after = datetime(2026, 8, 13, 0, 0, tzinfo=UTC)  # 20:00 EDT Aug 12
    nxt = whatsapp_followup_time(
        after=after,
        timezone_name="America/New_York",
        delay_hours=3,
        quiet_hours=default_quiet_hours(),
    )
    local = nxt.astimezone(ZoneInfo("America/New_York"))
    assert local.hour == 8
    assert local.date() == datetime(2026, 8, 13).date()


def test_whatsapp_followup_within_day():
    after = datetime(2026, 8, 12, 14, 0, tzinfo=UTC)  # 10am EDT
    nxt = whatsapp_followup_time(
        after=after,
        timezone_name="America/New_York",
        delay_hours=3,
        quiet_hours=default_quiet_hours(),
    )
    local = nxt.astimezone(ZoneInfo("America/New_York"))
    assert local.hour == 13
    assert local.date() == datetime(2026, 8, 12).date()

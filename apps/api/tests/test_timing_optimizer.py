from datetime import UTC, datetime
from zoneinfo import ZoneInfo

from gentletap.intelligence.schemas import ClientProfile, InvoiceContext, ReminderContext
from gentletap.intelligence.timing_optimizer import next_send_window

_ET = ZoneInfo("America/New_York")


def _ctx(*, sequence_step: int = 0, tz: str = "America/New_York") -> ReminderContext:
    return ReminderContext(
        client_id="c1",
        client_name="Acme",
        client_email="a@acme.com",
        business_timezone=tz,
        invoice=InvoiceContext(
            invoice_id="i1",
            doc_number="1001",
            amount=100.0,
            balance=100.0,
            days_overdue=5,
            due_date=datetime.now(UTC),
            sequence_step=sequence_step,
            approved=True,
        ),
        profile=ClientProfile(),
    )


def test_first_reminder_send_window_is_immediate():
    before = datetime.now(UTC)
    send_at = next_send_window(_ctx(sequence_step=0))
    after = datetime.now(UTC)
    assert before <= send_at <= after


def test_follow_up_during_business_hours_sends_now():
    # Wed 10:00 ET is inside the window -> send immediately.
    now = datetime(2026, 7, 1, 10, 0, tzinfo=_ET).astimezone(UTC)
    send_at = next_send_window(_ctx(sequence_step=2), now=now)
    assert send_at == now


def test_follow_up_before_hours_waits_for_opening():
    # Wed 03:00 ET -> should wait until 08:00 ET the same day.
    now = datetime(2026, 7, 1, 3, 0, tzinfo=_ET).astimezone(UTC)
    send_at = next_send_window(_ctx(sequence_step=2), now=now)
    assert send_at.astimezone(_ET) == datetime(2026, 7, 1, 8, 0, tzinfo=_ET)


def test_follow_up_after_hours_waits_for_next_day():
    # Wed 20:00 ET -> next window is Thu 08:00 ET.
    now = datetime(2026, 7, 1, 20, 0, tzinfo=_ET).astimezone(UTC)
    send_at = next_send_window(_ctx(sequence_step=2), now=now)
    assert send_at.astimezone(_ET) == datetime(2026, 7, 2, 8, 0, tzinfo=_ET)


def test_follow_up_on_weekend_waits_for_monday():
    # Saturday 11:00 ET -> next window is Monday 08:00 ET.
    now = datetime(2026, 7, 4, 11, 0, tzinfo=_ET).astimezone(UTC)
    send_at = next_send_window(_ctx(sequence_step=2), now=now)
    assert send_at.astimezone(_ET) == datetime(2026, 7, 6, 8, 0, tzinfo=_ET)


def test_unknown_timezone_falls_back_gracefully():
    now = datetime(2026, 7, 1, 10, 0, tzinfo=UTC)
    # Should not raise even if the tz name is invalid; returns a valid UTC datetime.
    send_at = next_send_window(_ctx(sequence_step=2, tz="Not/AZone"), now=now)
    assert send_at.tzinfo is not None

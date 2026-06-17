"""Tests for free-plan monthly collection limits."""

from datetime import UTC, datetime, timedelta

from gentletap.services.plan_limits import mark_collection_started, uses_new_monthly_slot


class _FakeInvoice:
    def __init__(self, *, sequence_started_at=None):
        self.sequence_started_at = sequence_started_at


def test_uses_new_monthly_slot_when_never_started():
    assert uses_new_monthly_slot(_FakeInvoice()) is True


def test_uses_new_monthly_slot_when_started_last_month():
    last_month = datetime.now(UTC).replace(day=1) - timedelta(days=1)
    assert uses_new_monthly_slot(_FakeInvoice(sequence_started_at=last_month)) is True


def test_no_new_slot_when_started_this_month():
    now = datetime.now(UTC)
    assert uses_new_monthly_slot(_FakeInvoice(sequence_started_at=now)) is False


def test_mark_collection_started_sets_timestamp():
    inv = _FakeInvoice()
    mark_collection_started(inv)
    assert inv.sequence_started_at is not None

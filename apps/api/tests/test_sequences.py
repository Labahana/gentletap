from datetime import UTC, datetime
from uuid import uuid4

from gentletap.database import Invoice, ReminderJob
from gentletap.services.sequences import schedule_next_job


class _FakeQuery:
    def __init__(self, row):
        self._row = row

    def filter(self, *args, **kwargs):
        return self

    def one_or_none(self):
        return self._row


class _FakeDb:
    def __init__(self, row):
        self._row = row
        self.flushed = False

    def query(self, model):
        if model is ReminderJob:
            return _FakeQuery(self._row)
        # AutomationSettings (and anything else) -> not found, service creates a default row
        return _FakeQuery(None)

    def add(self, _obj):
        pass

    def flush(self):
        self.flushed = True


def _invoice(**kwargs) -> Invoice:
    inv = Invoice(
        id=kwargs.get("id", uuid4()),
        user_id=uuid4(),
        client_id=uuid4(),
        qb_invoice_id="csv:INV-1",
        amount=100,
        balance=100,
        sequence_active=True,
        sequence_step=0,
    )
    for key, value in kwargs.items():
        setattr(inv, key, value)
    return inv


def test_schedule_next_job_reuses_cancelled_job():
    invoice = _invoice()
    cancelled = ReminderJob(
        id=uuid4(),
        invoice_id=invoice.id,
        sequence_step=0,
        status="cancelled",
        scheduled_for=datetime(2020, 1, 1, tzinfo=UTC),
    )
    db = _FakeDb(cancelled)

    job = schedule_next_job(db, invoice, scheduled_for=datetime.now(UTC))

    assert job is cancelled
    assert job.status == "pending"
    assert db.flushed is True


def test_schedule_next_job_reactivates_sent_job_on_reopen():
    """A paid-then-reopened invoice must not stall: the stale 'sent' job flips back to pending."""
    invoice = _invoice()
    sent = ReminderJob(
        id=uuid4(),
        invoice_id=invoice.id,
        sequence_step=0,
        status="sent",
        scheduled_for=datetime(2020, 1, 1, tzinfo=UTC),
        celery_task_id="abc",
    )
    db = _FakeDb(sent)

    job = schedule_next_job(db, invoice, scheduled_for=datetime.now(UTC))

    assert job is sent
    assert job.status == "pending"
    assert job.celery_task_id is None
    assert db.flushed is True

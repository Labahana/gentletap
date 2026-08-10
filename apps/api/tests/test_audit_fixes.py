"""Regression tests for the 10-agent engineering audit fixes."""

from datetime import UTC, datetime
from uuid import uuid4

import pytest


# --- WhatsApp STOP / opt-out (TCPA) -----------------------------------------

@pytest.mark.parametrize(
    "text",
    ["STOP", "stop", "Stop all messages", "UNSUBSCRIBE", "cancel", "quit", "opt out", "opt-out"],
)
def test_whatsapp_opt_out_keywords_detected(text):
    from gentletap.services.whatsapp_opt_out import is_whatsapp_opt_out

    assert is_whatsapp_opt_out(text) is True


@pytest.mark.parametrize(
    "text",
    ["", "please stop by the office", "I already paid, stop worrying", "can you hold off?"],
)
def test_non_opt_out_messages_not_flagged(text):
    from gentletap.services.whatsapp_opt_out import is_whatsapp_opt_out

    assert is_whatsapp_opt_out(text) is False


def test_whatsapp_send_blocked_when_opted_out():
    from gentletap.services.reminder_contacts import whatsapp_send_allowed

    class _C:
        whatsapp_opted_out = True

    class _Inv:
        client = _C()

    assert whatsapp_send_allowed(_Inv()) is False


# --- Step-4 (day-21) final reminder must SEND, not escalate ------------------

def _ctx(sequence_step: int, days_overdue: int = 5, amount: float = 500.0):
    from gentletap.intelligence.schemas import (
        ClientProfile,
        InvoiceContext,
        ReminderContext,
    )

    return ReminderContext(
        client_id="c1",
        client_name="Mike",
        client_email="mike@example.com",
        profile=ClientProfile(),
        invoice=InvoiceContext(
            invoice_id="inv",
            doc_number="5678",
            amount=amount,
            balance=amount,
            days_overdue=days_overdue,
            due_date=datetime.now(UTC),
            sequence_step=sequence_step,
            approved=True,
        ),
    )


def test_step_four_sends_final_notice_not_escalate():
    """The dead step-4 bug: sequence_step=4 previously escalated before sending."""
    from gentletap.intelligence.escalation import should_escalate

    assert should_escalate(_ctx(sequence_step=4, days_overdue=10)) is False


def test_step_five_escalates():
    from gentletap.intelligence.escalation import should_escalate

    assert should_escalate(_ctx(sequence_step=5, days_overdue=10)) is True


def test_days_overdue_21_still_escalates():
    from gentletap.intelligence.escalation import should_escalate

    assert should_escalate(_ctx(sequence_step=2, days_overdue=21)) is True


def test_needs_human_unchanged_for_dashboard():
    from gentletap.intelligence.escalation import needs_human

    assert needs_human(_ctx(sequence_step=4, days_overdue=10)) is True


# --- Multi-currency large-invoice threshold ----------------------------------

def test_large_invoice_threshold_normalized_for_jpy():
    """¥1,000,000 (~$6,700) must NOT be flagged as a 'large' (>$10k USD) invoice."""
    from gentletap.intelligence.risk_scorer import RiskLevel, score_risk

    ctx = _ctx(sequence_step=1, days_overdue=2, amount=1_000_000)
    ctx.invoice.currency = "JPY"
    # Without normalization, amount>10_000 would push this toward HIGH.
    assert score_risk(ctx) != RiskLevel.HIGH


# --- Bounded reminder-job retries ---------------------------------------------

def _job(status="processing", attempts=0):
    from gentletap.database import ReminderJob

    return ReminderJob(
        id=uuid4(), invoice_id=uuid4(), sequence_step=0,
        status=status, attempts=attempts, scheduled_for=datetime.now(UTC),
    )


class _JobQuery:
    def __init__(self, row):
        self._row = row

    def filter(self, *a, **k):
        return self

    def one_or_none(self):
        return self._row


class _JobDb:
    def __init__(self, row):
        self._row = row
        self.committed = False

    def query(self, model):
        return _JobQuery(self._row)

    def commit(self):
        self.committed = True


def test_transient_failure_requeues_under_cap():
    from gentletap.tasks.reminders import _handle_job_failure

    job = _job(attempts=1)
    db = _JobDb(job)
    _handle_job_failure(db, str(job.id), Exception("429 rate limit"))
    assert job.status == "pending"
    assert job.attempts == 2


def test_permanent_failure_marks_failed():
    from gentletap.tasks.reminders import _handle_job_failure

    job = _job(attempts=0)
    db = _JobDb(job)
    _handle_job_failure(db, str(job.id), Exception("invalid recipient address"))
    assert job.status == "failed"
    assert job.attempts == 1


def test_retryable_failure_gives_up_at_cap():
    from gentletap.tasks.reminders import MAX_JOB_ATTEMPTS, _handle_job_failure

    job = _job(attempts=MAX_JOB_ATTEMPTS - 1)
    db = _JobDb(job)
    _handle_job_failure(db, str(job.id), Exception("timeout"))
    assert job.status == "failed"
    assert job.attempts == MAX_JOB_ATTEMPTS

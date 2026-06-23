from datetime import UTC, datetime

from gentletap.intelligence.schemas import ClientProfile, InvoiceContext, ReminderContext
from gentletap.intelligence.timing_optimizer import next_send_window


def _ctx(*, sequence_step: int = 0) -> ReminderContext:
    return ReminderContext(
        client_id="c1",
        client_name="Acme",
        client_email="a@acme.com",
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


def test_follow_up_send_window_is_immediate_when_job_is_due():
    before = datetime.now(UTC)
    send_at = next_send_window(_ctx(sequence_step=2))
    after = datetime.now(UTC)
    assert before <= send_at <= after

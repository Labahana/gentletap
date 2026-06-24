from datetime import UTC, datetime

from gentletap.intelligence.prompt_builder import build_reminder_prompts
from gentletap.intelligence.schemas import ClientProfile, InvoiceContext, ReminderContext, RiskLevel, Tone


def _ctx(*, step: int = 0, prior: int = 0, tenure: int = 3, late_rate: float = 0.0) -> ReminderContext:
    return ReminderContext(
        client_id="c1",
        client_name="Labahana",
        client_email="client@example.com",
        sender_name="Tahir Yusuf",
        prior_messages_count=prior,
        profile=ClientProfile(
            tenure_months=tenure,
            late_payment_rate=late_rate,
            risk_level=RiskLevel.LOW,
            invoices_paid_on_time=4,
            invoices_paid_late=1,
        ),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="INV-007",
            amount=150,
            balance=150,
            days_overdue=11,
            due_date=datetime(2026, 6, 12, tzinfo=UTC),
            sequence_step=step,
            approved=True,
            payment_link="https://pay.example.com/inv-007",
        ),
    )


def test_prompt_includes_sender_and_psychology():
    system, user = build_reminder_prompts(_ctx(), Tone.FRIENDLY)
    assert "Assume positive intent" in system
    assert "Tahir Yusuf" in user
    assert "Relationship read:" in user
    assert "Face-saving" in user


def test_prompt_reflects_sequence_step_and_prior_messages():
    _, user = build_reminder_prompts(_ctx(step=2, prior=2), Tone.PROFESSIONAL)
    assert "step: 2 of 4" in user
    assert "Prior reminders already sent on this invoice: 2" in user


def test_prompt_includes_payment_link():
    _, user = build_reminder_prompts(_ctx(), Tone.FRIENDLY)
    assert "https://pay.example.com/inv-007" in user

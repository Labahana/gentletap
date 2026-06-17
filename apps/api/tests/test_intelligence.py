from datetime import UTC, datetime

from gentletap.intelligence.engine import IntelligenceEngine
from gentletap.intelligence.schemas import (
    Action,
    Channel,
    ClientProfile,
    InvoiceContext,
    ReminderContext,
)


def test_engine_sends_for_overdue_approved_invoice():
    ctx = ReminderContext(
        client_id="c1",
        client_name="Sarah",
        client_email="sarah@example.com",
        profile=ClientProfile(late_payment_rate=0.1, tenure_months=14),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="1234",
            amount=4200,
            balance=4200,
            days_overdue=5,
            due_date=datetime.now(UTC),
            sequence_step=0,
            approved=True,
        ),
    )
    result = IntelligenceEngine().decide(ctx)
    assert result.action == Action.SEND
    assert result.message is not None
    assert "1234" in result.message.body


def test_engine_waits_when_not_approved():
    ctx = ReminderContext(
        client_id="c1",
        client_name="Sarah",
        client_email="sarah@example.com",
        profile=ClientProfile(),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="1234",
            amount=4200,
            balance=4200,
            days_overdue=5,
            due_date=datetime.now(UTC),
            approved=False,
        ),
    )
    result = IntelligenceEngine().decide(ctx)
    assert result.action == Action.WAIT
    assert result.reason == "pending_approval"


def test_engine_escalates_at_21_days():
    ctx = ReminderContext(
        client_id="c1",
        client_name="Mike",
        client_email="mike@example.com",
        profile=ClientProfile(late_payment_rate=0.8),
        invoice=InvoiceContext(
            invoice_id="inv2",
            doc_number="5678",
            amount=8500,
            balance=8500,
            days_overdue=21,
            due_date=datetime.now(UTC),
            sequence_step=4,
            approved=True,
        ),
    )
    result = IntelligenceEngine().decide(ctx)
    assert result.action == Action.ESCALATE


def test_engine_selects_whatsapp_for_pro_step_one_plus():
    ctx = ReminderContext(
        client_id="c1",
        client_name="Sarah",
        client_email="sarah@example.com",
        client_phone="+15551234567",
        user_plan="pro_plus",
        profile=ClientProfile(preferred_channel="whatsapp"),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="1234",
            amount=4200,
            balance=4200,
            days_overdue=5,
            due_date=datetime.now(UTC),
            sequence_step=1,
            approved=True,
        ),
    )
    result = IntelligenceEngine().decide(ctx)
    assert result.action == Action.SEND
    assert result.channel == Channel.WHATSAPP

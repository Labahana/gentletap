"""Autonomy: the intelligence engine must never pre-emptively hand off a send.

High-value / long-overdue invoices used to be skipped with
reason=human_handoff_recommended before even the first reminder went out.
Autopilot is meant to be hands-off, so decide() now always SENDs (the dashboard
"needs you" list still surfaces risky invoices, non-blocking)."""

import os
import sys
from datetime import datetime, timedelta, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ.setdefault("SECRET_KEY", "test")
os.environ.setdefault("JWT_SECRET_KEY", "test")
os.environ.setdefault("POSTGRES_PASSWORD", "test")
os.environ.setdefault("REDIS_PASSWORD", "test")
os.environ.setdefault("PADDLE_API_KEY", "test")
os.environ.setdefault("PADDLE_CLIENT_TOKEN", "test")

from app.intelligence.engine import engine
from app.intelligence.schemas import Action, ClientProfile, InvoiceContext, ReminderContext


def _ctx(*, days_overdue: int, balance: float, step: int = 0) -> ReminderContext:
    now = datetime.now(timezone.utc)
    return ReminderContext(
        client_id="c1",
        client_name="Big Client",
        client_email="big@example.com",
        client_phone=None,
        invoice=InvoiceContext(
            invoice_id="i1",
            doc_number="INV-BIG",
            amount=balance,
            balance=balance,
            days_overdue=days_overdue,
            due_date=now - timedelta(days=days_overdue),
            sequence_step=step,
            approved=True,
        ),
        profile=ClientProfile(),
    )


def test_high_value_long_overdue_still_sends():
    # Previously would ESCALATE: $45k, 29 days overdue.
    result = engine.decide(_ctx(days_overdue=29, balance=45678.0), generate_message=False)
    assert result.action == Action.SEND
    assert result.reason != "human_handoff_recommended"


def test_deeply_overdue_late_step_still_sends():
    # Previously would ESCALATE at step >= 5.
    result = engine.decide(_ctx(days_overdue=60, balance=500.0, step=6), generate_message=False)
    assert result.action == Action.SEND


def test_paid_invoice_still_waits():
    # Legitimate WAIT conditions are untouched by the handoff removal.
    ctx = _ctx(days_overdue=29, balance=0.0)
    result = engine.decide(ctx, generate_message=False)
    assert result.action == Action.WAIT
    assert result.reason == "invoice_paid"

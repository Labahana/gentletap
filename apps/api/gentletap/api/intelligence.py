from datetime import UTC, datetime

from fastapi import APIRouter

from gentletap.intelligence.engine import IntelligenceEngine
from gentletap.intelligence.schemas import (
    ClientProfile,
    DecideResult,
    InvoiceContext,
    ReminderContext,
)

router = APIRouter(prefix="/intelligence", tags=["intelligence"])


@router.post("/preview", response_model=DecideResult)
def preview_reminder() -> DecideResult:
    """Demo preview — Sarah / $4,200 invoice (onboarding Stage 6 sample)."""
    ctx = ReminderContext(
        client_id="demo",
        client_name="Sarah",
        client_email="sarah@client.com",
        profile=ClientProfile(
            avg_days_to_pay=12,
            late_payment_rate=0.15,
            invoices_paid_on_time=8,
            invoices_paid_late=2,
            lifetime_value=28400,
            tenure_months=14,
        ),
        invoice=InvoiceContext(
            invoice_id="demo-inv",
            doc_number="1234",
            amount=4200,
            balance=4200,
            days_overdue=5,
            due_date=datetime.now(UTC),
            sequence_step=0,
            approved=True,
        ),
    )
    return IntelligenceEngine().decide(ctx)

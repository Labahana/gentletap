from datetime import UTC, datetime

from gentletap.intelligence.engine import IntelligenceEngine
from gentletap.intelligence.risk_scorer import score_risk
from gentletap.intelligence.schemas import (
    ClientProfile,
    InvoiceContext,
    ReminderContext,
    RiskLevel,
    Tone,
)
from gentletap.intelligence.tone_selector import select_tone


def _ctx(
    *,
    days_overdue: int = 0,
    sequence_step: int = 0,
    amount: float = 1000.0,
    balance: float | None = None,
    late_payment_rate: float = 0.0,
    tenure_months: int = 0,
    client_email: str | None = "client@example.com",
    client_phone: str | None = None,
    email_suppressed: bool = False,
    approved: bool = True,
) -> ReminderContext:
    return ReminderContext(
        client_id="c1",
        client_name="Client",
        client_email=client_email,
        client_phone=client_phone,
        email_suppressed=email_suppressed,
        profile=ClientProfile(
            late_payment_rate=late_payment_rate,
            tenure_months=tenure_months,
        ),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="1234",
            amount=amount,
            balance=balance if balance is not None else amount,
            days_overdue=days_overdue,
            due_date=datetime.now(UTC),
            sequence_step=sequence_step,
            approved=approved,
        ),
    )


# --- risk_scorer thresholds -------------------------------------------------

def test_risk_low_for_clean_recent_invoice():
    ctx = _ctx(days_overdue=5, late_payment_rate=0.0, amount=100)
    assert score_risk(ctx) == RiskLevel.LOW


def test_risk_medium_band():
    # 0.4*0.5 + 0.3*(15/30) = 0.20 + 0.15 = 0.35 -> medium (>=0.3, <0.6)
    ctx = _ctx(days_overdue=15, late_payment_rate=0.5, amount=100)
    assert score_risk(ctx) == RiskLevel.MEDIUM


def test_risk_high_band():
    # 0.4*0.8 + 0.3*1.0 + 0.2*1 (>=21) = 0.32 + 0.25 + 0.2 = 0.77 -> high
    ctx = _ctx(days_overdue=25, late_payment_rate=0.8, amount=100)
    assert score_risk(ctx) == RiskLevel.HIGH


def test_risk_large_amount_bumps_score():
    low = score_risk(_ctx(days_overdue=5, late_payment_rate=0.4, amount=100))
    high = score_risk(_ctx(days_overdue=5, late_payment_rate=0.4, amount=20_000))
    assert low == RiskLevel.LOW
    assert high == RiskLevel.MEDIUM


# --- tone_selector matrix ---------------------------------------------------

def test_tone_urgent_at_step_four_or_21_days():
    assert select_tone(_ctx(sequence_step=4), RiskLevel.LOW) == Tone.URGENT
    assert select_tone(_ctx(days_overdue=21), RiskLevel.LOW) == Tone.URGENT


def test_tone_firm_at_step_three_or_14_days():
    assert select_tone(_ctx(sequence_step=3), RiskLevel.LOW) == Tone.FIRM
    assert select_tone(_ctx(days_overdue=14), RiskLevel.LOW) == Tone.FIRM


def test_tone_professional_at_step_two_or_7_days():
    assert select_tone(_ctx(sequence_step=2), RiskLevel.LOW) == Tone.PROFESSIONAL
    assert select_tone(_ctx(days_overdue=7), RiskLevel.LOW) == Tone.PROFESSIONAL


def test_tone_warm_for_trusted_long_term_client():
    ctx = _ctx(sequence_step=0, days_overdue=2, tenure_months=14, late_payment_rate=0.1)
    assert select_tone(ctx, RiskLevel.LOW) == Tone.WARM


def test_tone_warm_for_low_risk_first_touch():
    ctx = _ctx(sequence_step=0, days_overdue=2, tenure_months=2, late_payment_rate=0.0)
    assert select_tone(ctx, RiskLevel.LOW) == Tone.WARM


def test_high_risk_makes_early_step_professional():
    # Same context, differing only by risk -> proves risk now influences tone.
    ctx = _ctx(sequence_step=0, days_overdue=2, tenure_months=14, late_payment_rate=0.1)
    assert select_tone(ctx, RiskLevel.LOW) == Tone.WARM
    assert select_tone(ctx, RiskLevel.HIGH) == Tone.PROFESSIONAL


def test_high_value_invoice_never_warmest():
    # Trusted long-term client but a large balance -> stay careful (friendly, not warm).
    ctx = _ctx(sequence_step=0, days_overdue=2, tenure_months=14, late_payment_rate=0.1, amount=15_000)
    assert select_tone(ctx, RiskLevel.LOW) == Tone.FRIENDLY


def test_frequent_late_payer_gets_professional_early():
    ctx = _ctx(sequence_step=1, days_overdue=2, late_payment_rate=0.6)
    assert select_tone(ctx, RiskLevel.LOW) == Tone.PROFESSIONAL


# --- should_send suppression edge cases -------------------------------------

def test_suppressed_email_blocks_email_only_step_zero():
    ctx = _ctx(sequence_step=0, days_overdue=3, email_suppressed=True, client_phone="+15551234567")
    ok, reason = IntelligenceEngine().should_send(ctx)
    assert ok is False
    assert reason == "email_suppressed"


def test_suppressed_email_allows_whatsapp_step_with_phone():
    ctx = _ctx(sequence_step=1, days_overdue=3, email_suppressed=True, client_phone="+15551234567")
    ok, reason = IntelligenceEngine().should_send(ctx)
    assert ok is True
    assert reason is None


def test_suppressed_email_without_phone_blocks_middle_step():
    ctx = _ctx(sequence_step=1, days_overdue=3, email_suppressed=True, client_phone=None)
    ok, reason = IntelligenceEngine().should_send(ctx)
    assert ok is False
    assert reason == "no_client_contact"

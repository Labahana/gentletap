"""Two-tier risk model.

`baseline_risk_from_history` is the *relationship* risk derived from payment history
alone — it's computed during profiling and stored on the client. `score_risk` is the
*live* risk used at decision time: it layers the current invoice's urgency (days
overdue, amount) on top of that history. Both share the same LOW/MEDIUM/HIGH labels
but answer different questions, so they're expected to differ for a given moment.
"""

from gentletap.intelligence.schemas import (
    ReminderContext,
    RiskLevel,
)

# Shared cut points for history-only (baseline) risk, kept in one place so the
# profiler and any consumer of a stored client risk level stay consistent.
_BASELINE_HIGH = 0.5
_BASELINE_MEDIUM = 0.25

# The "large invoice" signal ($10k) must hold across currencies. These are
# approximate per-unit USD rates — good enough for a coarse threshold, and they
# keep a ¥1,000,000 invoice from being scored as "large" purely on magnitude.
_APPROX_USD_PER_UNIT = {
    "USD": 1.0, "CAD": 0.73, "AUD": 0.66, "EUR": 1.09, "GBP": 1.27,
    "NGN": 0.00066, "JPY": 0.0067, "INR": 0.012,
}

_LARGE_INVOICE_USD = 10_000.0


def baseline_risk_from_history(late_payment_rate: float) -> RiskLevel:
    """Relationship risk from payment history alone (no live invoice signal)."""
    if late_payment_rate >= _BASELINE_HIGH:
        return RiskLevel.HIGH
    if late_payment_rate >= _BASELINE_MEDIUM:
        return RiskLevel.MEDIUM
    return RiskLevel.LOW


def _to_approx_usd(amount: float, currency: str) -> float:
    rate = _APPROX_USD_PER_UNIT.get((currency or "USD").upper(), 1.0)
    return amount * rate


def score_risk(ctx: ReminderContext) -> RiskLevel:
    """Live risk for the current reminder: history weighted with invoice urgency."""
    profile = ctx.profile
    inv = ctx.invoice
    amount_usd = _to_approx_usd(float(inv.amount), getattr(inv, "currency", "USD"))
    score = (
        0.4 * profile.late_payment_rate
        + 0.3 * min(inv.days_overdue / 30, 1.0)
        + 0.2 * (1.0 if inv.days_overdue >= 21 else 0.0)
        + 0.1 * (1.0 if amount_usd > _LARGE_INVOICE_USD else 0.0)
    )
    if score < 0.3:
        return RiskLevel.LOW
    if score < 0.6:
        return RiskLevel.MEDIUM
    return RiskLevel.HIGH

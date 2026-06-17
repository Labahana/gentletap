from gentletap.intelligence.schemas import (
    ClientProfile,
    InvoiceContext,
    ReminderContext,
    RiskLevel,
)


def score_risk(ctx: ReminderContext) -> RiskLevel:
    profile = ctx.profile
    inv = ctx.invoice
    score = (
        0.4 * profile.late_payment_rate
        + 0.3 * min(inv.days_overdue / 30, 1.0)
        + 0.2 * (1.0 if inv.days_overdue >= 21 else 0.0)
        + 0.1 * (1.0 if inv.amount > 10_000 else 0.0)
    )
    if score < 0.3:
        return RiskLevel.LOW
    if score < 0.6:
        return RiskLevel.MEDIUM
    return RiskLevel.HIGH

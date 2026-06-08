from gentletap.intelligence.schemas import (
    BANNED_PHRASES,
    ClientProfile,
    InvoiceContext,
    ReminderContext,
    RiskLevel,
    Tone,
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


def select_tone(ctx: ReminderContext, risk: RiskLevel) -> Tone:
    inv = ctx.invoice
    profile = ctx.profile

    if inv.sequence_step >= 4 or inv.days_overdue >= 21:
        return Tone.URGENT
    if inv.sequence_step >= 3 or inv.days_overdue >= 14:
        return Tone.FIRM
    if inv.sequence_step >= 2 or inv.days_overdue >= 7:
        return Tone.PROFESSIONAL
    if profile.late_payment_rate > 0.5:
        return Tone.PROFESSIONAL
    if profile.tenure_months >= 12 and profile.late_payment_rate < 0.2:
        return Tone.WARM
    if risk == RiskLevel.LOW:
        return Tone.FRIENDLY
    return Tone.FRIENDLY

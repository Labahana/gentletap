from gentletap.intelligence.schemas import ReminderContext, RiskLevel, Tone


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

from gentletap.intelligence.schemas import ReminderContext, RiskLevel, Tone


def select_tone(ctx: ReminderContext, risk: RiskLevel) -> Tone:
    inv = ctx.invoice
    profile = ctx.profile

    # Sequence progression and lateness set the firm floor.
    if inv.sequence_step >= 4 or inv.days_overdue >= 21:
        return Tone.URGENT
    if inv.sequence_step >= 3 or inv.days_overdue >= 14:
        return Tone.FIRM
    if inv.sequence_step >= 2 or inv.days_overdue >= 7:
        return Tone.PROFESSIONAL

    # Early steps (0–1, < 7 days late): tune warmth by relationship, risk, and amount.
    # A poor payment history or a high live risk score warrants a firmer register.
    if profile.late_payment_rate > 0.5 or risk == RiskLevel.HIGH:
        return Tone.PROFESSIONAL

    # Large balances warrant a more careful tone — never the warmest register.
    high_value = inv.amount > 10_000

    if not high_value:
        if profile.tenure_months >= 12 and profile.late_payment_rate < 0.2:
            return Tone.WARM
        if inv.sequence_step == 0 and risk == RiskLevel.LOW:
            return Tone.WARM
    return Tone.FRIENDLY

from app.intelligence.schemas import Channel, ReminderContext


def _whatsapp_step_eligible(sequence_step: int) -> bool:
    """WhatsApp follow-ups are scheduled on sequence steps 1-3 only."""
    return 1 <= sequence_step <= 3


def select_channel(ctx: ReminderContext) -> Channel:
    """Primary outbound is always email; WhatsApp is scheduled separately on steps 1–3."""
    return Channel.EMAIL


def whatsapp_followup_planned(ctx: ReminderContext) -> bool:
    """Whether a staggered WhatsApp follow-up will be scheduled after email."""
    return _whatsapp_step_eligible(ctx.invoice.sequence_step) and bool(ctx.client_phone)

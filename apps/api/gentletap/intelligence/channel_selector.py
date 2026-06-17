from gentletap.intelligence.schemas import Channel, ReminderContext
from gentletap.plans import whatsapp_step_eligible


def select_channel(ctx: ReminderContext) -> Channel:
    """Primary outbound is always email; WhatsApp is scheduled separately on steps 1–3."""
    return Channel.EMAIL


def whatsapp_followup_planned(ctx: ReminderContext) -> bool:
    """Whether a staggered WhatsApp follow-up will be scheduled after email."""
    return whatsapp_step_eligible(ctx.invoice.sequence_step) and bool(ctx.client_phone)

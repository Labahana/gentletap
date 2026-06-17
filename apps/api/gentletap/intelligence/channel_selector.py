from gentletap.intelligence.schemas import Channel, ReminderContext
from gentletap.plans import has_whatsapp


def select_channel(ctx: ReminderContext) -> Channel:
    """Email first; WhatsApp on step 1+ for Pro+ / Team when phone exists."""
    inv = ctx.invoice
    profile = ctx.profile

    use_whatsapp = (
        has_whatsapp(ctx.user_plan)
        and ctx.client_phone
        and inv.sequence_step >= 1
        and profile.preferred_channel != "email"
    )
    if use_whatsapp:
        return Channel.WHATSAPP
    return Channel.EMAIL

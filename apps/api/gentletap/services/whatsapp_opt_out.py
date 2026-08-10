"""WhatsApp STOP / opt-out keyword detection (TCPA + Twilio compliance)."""

import re

_OPT_OUT = re.compile(
    r"^\s*(stop|stopall|unsubscribe|cancel|end|quit|opt[\s-]?out|remove|arret)\b",
    re.IGNORECASE,
)


def is_whatsapp_opt_out(text: str) -> bool:
    """True when the inbound message is a standalone opt-out request."""
    return bool(_OPT_OUT.match(text or ""))

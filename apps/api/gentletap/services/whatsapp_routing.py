"""Resolve inbound WhatsApp routing for the shared platform sender."""

from gentletap.config import get_settings
from gentletap.integrations.twilio.phone import normalize_phone_e164, phones_match


def routed_via_for_to_phone(_db, to_phone: str) -> str:
    settings = get_settings()
    normalized_to = normalize_phone_e164(to_phone.replace("whatsapp:", ""))
    if not normalized_to:
        return "unknown"

    platform_from = settings.twilio_whatsapp_from or ""
    if platform_from and phones_match(platform_from, normalized_to):
        return "shared_number"
    return "unknown"

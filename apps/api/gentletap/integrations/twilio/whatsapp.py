"""Twilio WhatsApp send via Meta-approved Content Templates."""

import json

import httpx

from gentletap.config import get_settings
from gentletap.integrations.twilio import templates as wa_templates


def is_configured() -> bool:
    return wa_templates.templates_configured()


def send_whatsapp_template(
    *,
    to_phone: str,
    content_sid: str,
    content_variables: dict[str, str],
) -> str:
    """Send a business-initiated WhatsApp message using an approved Content Template."""
    settings = get_settings()
    if not settings.twilio_account_sid or not settings.twilio_auth_token or not settings.twilio_whatsapp_from:
        raise ValueError("WhatsApp is not configured")

    to = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
    from_num = settings.twilio_whatsapp_from
    if not from_num.startswith("whatsapp:"):
        from_num = f"whatsapp:{from_num}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            url,
            auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            data={
                "From": from_num,
                "To": to,
                "ContentSid": content_sid,
                "ContentVariables": json.dumps(content_variables),
            },
        )
        response.raise_for_status()
        return response.json().get("sid", "")

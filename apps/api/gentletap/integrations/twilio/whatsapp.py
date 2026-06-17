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
    from_number: str | None = None,
    account_sid: str | None = None,
    auth_token: str | None = None,
) -> str:
    """Send a business-initiated WhatsApp message using an approved Content Template."""
    settings = get_settings()
    sid = account_sid or settings.twilio_account_sid
    token = auth_token or settings.twilio_auth_token
    if not sid or not token:
        raise ValueError("WhatsApp is not configured")

    from_num = from_number or settings.twilio_whatsapp_from
    if not from_num:
        raise ValueError("WhatsApp sender number is not configured")

    to = to_phone if to_phone.startswith("whatsapp:") else f"whatsapp:{to_phone}"
    if not from_num.startswith("whatsapp:"):
        from_num = f"whatsapp:{from_num}"

    url = f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json"
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            url,
            auth=(sid, token),
            data={
                "From": from_num,
                "To": to,
                "ContentSid": content_sid,
                "ContentVariables": json.dumps(content_variables),
            },
        )
        response.raise_for_status()
        return response.json().get("sid", "")

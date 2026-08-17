"""Twilio WhatsApp Business messaging."""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

TEMPLATES = {
    1: "Hi {name}, just a friendly note about invoice {number} for {amount}. You can pay here: {link}",
    2: "Hi {name}, following up on invoice {number} ({amount}). Let us know if you need anything: {link}",
    3: "Hi {name}, invoice {number} for {amount} is still outstanding. Please reply with an ETA: {link}",
}


def render_whatsapp_body(step_index: int, *, name: str, number: str, amount: str, link: str) -> str:
    idx = min(max(step_index + 1, 1), 3)
    tpl = TEMPLATES[idx]
    return tpl.format(name=name, number=number, amount=amount, link=link)


def send_whatsapp(to_phone: str, body: str) -> Dict[str, Any]:
    """Send WhatsApp via Twilio. Mocks when credentials missing."""
    phone = to_phone.strip()
    if not phone.startswith("whatsapp:"):
        phone = f"whatsapp:{phone}" if phone.startswith("+") else f"whatsapp:+{phone}"

    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.info("[MOCK WHATSAPP] To: %s | Body: %s", phone, body[:80])
        return {"sid": f"mock_wa_{phone[-8:]}", "status": "sent", "mock": True}

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    data = {
        "From": settings.twilio_whatsapp_from,
        "To": phone,
        "Body": body,
    }
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                url,
                data=data,
                auth=(settings.twilio_account_sid, settings.twilio_auth_token),
            )
            if res.status_code in (200, 201):
                payload = res.json()
                return {"sid": payload.get("sid"), "status": payload.get("status", "sent"), "mock": False}
            logger.warning("Twilio WA failed: %s %s", res.status_code, res.text[:200])
            return {"sid": None, "status": "failed", "error": res.text[:200]}
    except Exception as exc:
        logger.warning("Twilio WA error: %s", exc)
        return {"sid": None, "status": "failed", "error": str(exc)}

"""Twilio WhatsApp Business messaging.

Two send modes:
  - Meta **Content Templates** (approved `ContentSid` + `ContentVariables`) — the
    only mode Meta allows for business-initiated messages on a live number.
  - Plain `Body` — used for the Twilio sandbox and as a fallback when no
    Content SID is configured.

To go live, create three WhatsApp "Utility" content templates in the Twilio
Console (Content → Message Templates) with these numbered variables and paste
their SIDs into the matching env vars:
  gentle    : {{1}}=first name {{2}}=business {{3}}=invoice # {{4}}=amount {{5}}=overdue note
  follow_up : same variables, firmer copy
  final     : same variables, final notice copy
Env vars: TWILIO_WHATSAPP_CONTENT_SID_GENTLE / _FOLLOW_UP / _FINAL
"""

from __future__ import annotations

import json
import logging
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Plain-body fallback copy (sandbox / no Content SID configured).
TEMPLATES = {
    1: "Hi {name}, just a friendly note about invoice {number} for {amount}.{cta}",
    2: "Hi {name}, following up on invoice {number} ({amount}). Let us know if you need anything.{cta}",
    3: "Hi {name}, invoice {number} for {amount} is still outstanding. Please reply with an ETA.{cta}",
}

_CONTENT_SID_BY_KEY = {
    "gentle": lambda: settings.twilio_whatsapp_content_sid_gentle,
    "follow_up": lambda: settings.twilio_whatsapp_content_sid_follow_up,
    "final": lambda: settings.twilio_whatsapp_content_sid_final,
}


def render_whatsapp_body(step_index: int, *, name: str, number: str, amount: str, link: Optional[str] = None) -> str:
    idx = min(max(step_index + 1, 1), 3)
    tpl = TEMPLATES[idx]
    cta = f" You can pay here: {link.strip()}" if link and link.strip() else ""
    return tpl.format(name=name, number=number, amount=amount, cta=cta)


def select_template_key(step_index: int, tone: Optional[str] = None) -> str:
    """Map a reminder step/tone to one of the three Meta template buckets."""
    if (tone or "").lower() in ("firm", "urgent") or step_index >= 2:
        return "final"
    if (tone or "").lower() == "professional" or step_index >= 1:
        return "follow_up"
    return "gentle"


def content_sid_for(template_key: str) -> str:
    getter = _CONTENT_SID_BY_KEY.get(template_key)
    return (getter() or "").strip() if getter else ""


def build_variables(*, name: str, sender_name: str, number: str, amount: str, days_overdue: int) -> Dict[str, str]:
    """Positional variables matching the {{1}}..{{5}} Meta utility templates."""
    overdue = f"{days_overdue} days past due" if days_overdue and days_overdue > 0 else "due soon"
    return {
        "1": (name or "there")[:40],
        "2": (sender_name or "our team")[:40],
        "3": (number or "")[:30],
        "4": (amount or "")[:30],
        "5": overdue[:60],
    }


def send_whatsapp(
    to_phone: str,
    body: str,
    *,
    content_sid: Optional[str] = None,
    variables: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """Send WhatsApp via Twilio. Mocks when credentials missing.

    When `content_sid` (+ `variables`) is supplied, sends a Meta-approved content
    template — required for live business-initiated messages. Otherwise falls back
    to a plain `Body` (sandbox only).
    """
    phone = to_phone.strip()
    if not phone.startswith("whatsapp:"):
        phone = f"whatsapp:{phone}" if phone.startswith("+") else f"whatsapp:+{phone}"

    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        logger.info("[MOCK WHATSAPP] To: %s | Body: %s", phone, body[:80])
        return {"sid": f"mock_wa_{phone[-8:]}", "status": "sent", "mock": True}

    url = f"https://api.twilio.com/2010-04-01/Accounts/{settings.twilio_account_sid}/Messages.json"
    data = {"From": settings.twilio_whatsapp_from, "To": phone}
    if content_sid and variables:
        data["ContentSid"] = content_sid
        data["ContentVariables"] = json.dumps(variables)
    else:
        data["Body"] = body

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

"""WhatsApp Business templates (Meta-approved via Twilio Content API).

Business-initiated WhatsApp messages must use pre-approved templates — free-form
Body text is rejected outside the 24-hour customer care window.

Submit these exact template bodies in Twilio Content Template Builder / Meta Business
Manager, then paste each Content SID (HX...) into .env.
"""

from __future__ import annotations

from dataclasses import dataclass

from gentletap.config import get_settings
from gentletap.intelligence.schemas import ReminderContext, Tone

# Exact copy for Meta approval — variable placeholders must match build_variables().
META_TEMPLATE_COPY: dict[str, str] = {
    "gentle": (
        "Hello {{1}}, this is {{2}}. Just a friendly reminder that invoice {{3}} "
        "for {{4}} is outstanding{{5}}. Please reply if you have any questions."
    ),
    "follow_up": (
        "Hi {{1}}, following up from {{2}} regarding invoice {{3}} for {{4}}{{5}}. "
        "We'd appreciate an update on payment when you have a moment."
    ),
    "final": (
        "Hi {{1}}, this is {{2}} checking in about invoice {{3}} for {{4}}{{5}}. "
        "Please confirm payment status or reply if you need to discuss."
    ),
}


@dataclass(frozen=True)
class WhatsAppTemplatePayload:
    template_key: str
    content_sid: str
    variables: dict[str, str]
    preview_body: str


def select_template_key(sequence_step: int, tone: str | Tone | None) -> str:
    tone_value = tone.value if isinstance(tone, Tone) else (tone or "")
    if sequence_step >= 4 or tone_value in (Tone.FIRM.value, Tone.URGENT.value):
        return "final"
    if sequence_step >= 2 or tone_value == Tone.PROFESSIONAL.value:
        return "follow_up"
    return "gentle"


def content_sid_for(template_key: str) -> str | None:
    settings = get_settings()
    mapping = {
        "gentle": settings.twilio_whatsapp_content_sid_gentle,
        "follow_up": settings.twilio_whatsapp_content_sid_follow_up,
        "final": settings.twilio_whatsapp_content_sid_final,
    }
    sid = mapping.get(template_key, "").strip()
    return sid or None


def templates_configured() -> bool:
    settings = get_settings()
    if not (settings.twilio_account_sid and settings.twilio_auth_token):
        return False
    return any(content_sid_for(key) for key in META_TEMPLATE_COPY)


def platform_sender_configured() -> bool:
    return bool((get_settings().twilio_whatsapp_from or "").strip())


def _format_amount(balance: float, currency: str) -> str:
    symbol = "$" if currency == "USD" else f"{currency} "
    return f"{symbol}{balance:,.2f}"


def _overdue_suffix(days_overdue: int) -> str:
    if days_overdue <= 0:
        return ""
    day_word = "day" if days_overdue == 1 else "days"
    return f" ({days_overdue} {day_word} overdue)"


def _truncate(value: str, limit: int) -> str:
    value = value.strip()
    if len(value) <= limit:
        return value
    return value[: limit - 1].rstrip() + "…"


def build_variables(ctx: ReminderContext, *, sender_name: str) -> dict[str, str]:
    inv = ctx.invoice
    return {
        "1": _truncate(ctx.client_name, 40),
        "2": _truncate(sender_name, 40),
        "3": _truncate(inv.doc_number, 30),
        "4": _format_amount(inv.balance, inv.currency),
        "5": _overdue_suffix(inv.days_overdue),
    }


def render_preview(template_key: str, variables: dict[str, str]) -> str:
    body = META_TEMPLATE_COPY[template_key]
    for key, value in variables.items():
        body = body.replace(f"{{{{{key}}}}}", value)
    return body


def build_payload(
    ctx: ReminderContext,
    *,
    sender_name: str,
    sequence_step: int | None = None,
    tone: str | Tone | None = None,
) -> WhatsAppTemplatePayload:
    step = sequence_step if sequence_step is not None else ctx.invoice.sequence_step
    template_key = select_template_key(step, tone)
    content_sid = content_sid_for(template_key)
    if not content_sid:
        raise ValueError(
            f"WhatsApp template '{template_key}' is not configured — add Content SID to .env "
            f"(see META_TEMPLATE_COPY in integrations/twilio/templates.py)"
        )
    variables = build_variables(ctx, sender_name=sender_name)
    return WhatsAppTemplatePayload(
        template_key=template_key,
        content_sid=content_sid,
        variables=variables,
        preview_body=render_preview(template_key, variables),
    )

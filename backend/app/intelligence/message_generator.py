"""AI message generation for reminder decisions.

Ported from the old intelligence package and re-wired onto the new AI provider
layer (Kimi primary, Z.AI fallback, static template last resort).
"""

import json
import logging
import re

from app.config import get_settings
from app.intelligence.prompt_builder import build_reminder_prompts
from app.intelligence.schemas import BANNED_PHRASES, Channel, GeneratedMessage, ReminderContext, Tone
from app.services.ai.kimi import call_kimi
from app.services.ai.zai import call_zai

logger = logging.getLogger(__name__)


def _contains_banned(text: str) -> bool:
    lower = text.lower()
    return any(phrase in lower for phrase in BANNED_PHRASES)


def _payment_link_line(payment_link: str | None) -> str:
    if not payment_link:
        return ""
    return f"\n\nPay online: {payment_link}"


def _fallback_message(ctx: ReminderContext, tone: Tone) -> GeneratedMessage:
    inv = ctx.invoice
    step = min(inv.sequence_step, 4)
    due_str = inv.due_date.strftime("%B %d, %Y") if inv.due_date else "the due date"
    amount = f"${inv.balance:,.2f}"

    subjects = {
        0: f"Quick check-in: invoice #{inv.doc_number}",
        1: f"Following up on invoice #{inv.doc_number}",
        2: f"Invoice #{inv.doc_number} — payment status",
        3: f"Invoice #{inv.doc_number} — action needed",
        4: f"Invoice #{inv.doc_number} — please reply",
    }
    subject = subjects.get(step, f"Invoice #{inv.doc_number}")

    if step == 0:
        opener = (
            f"Hi {ctx.client_name},\n\n"
            f"Hope you're doing well. I'm checking in on invoice #{inv.doc_number} "
            f"for {amount}, which was due {due_str}."
        )
        ask = (
            "When you have a moment, could you confirm it's been scheduled "
            "or let me know if anything's holding it up?"
        )
    elif step <= 2:
        opener = (
            f"Hi {ctx.client_name},\n\n"
            f"Following up on invoice #{inv.doc_number} for {amount} "
            f"(due {due_str}, now {inv.days_overdue} days past due)."
        )
        ask = "Could you let me know when you expect this to be processed?"
    else:
        opener = (
            f"Hi {ctx.client_name},\n\n"
            f"I wanted to reach out again about invoice #{inv.doc_number} "
            f"for {amount}, due {due_str}."
        )
        ask = (
            "I'd appreciate a quick reply with an ETA or any issue on your end — "
            "happy to help if something needs sorting."
        )

    body = f"{opener}\n\n{ask}{_payment_link_line(inv.payment_link)}\n\nBest regards,\n{ctx.sender_name}"
    return GeneratedMessage(subject=subject, body=body)


_PLACEHOLDER_RE = re.compile(
    r"\[\s*(your\s+)?(name|full name|name here|sender(?:'s)?\s+name|signature)\s*\]"
    r"|\{\{?\s*(your_name|name|sender_name|signature)\s*\}?\}",
    re.IGNORECASE,
)


def _replace_name_placeholders(text: str, sender_name: str) -> str:
    """Swap leftover signature placeholders (e.g. [Your Name]) with the real sender."""
    return _PLACEHOLDER_RE.sub(sender_name, text)


def _finalize(message: GeneratedMessage, sender_name: str) -> GeneratedMessage:
    return GeneratedMessage(
        subject=_replace_name_placeholders(message.subject, sender_name),
        body=_replace_name_placeholders(message.body, sender_name),
        whatsapp_template_key=message.whatsapp_template_key,
    )


def generate_whatsapp_message(ctx: ReminderContext, tone: Tone) -> GeneratedMessage:
    """WhatsApp uses pre-approved template bodies — not free-form AI text."""
    from app.services.whatsapp import render_whatsapp_body

    inv = ctx.invoice
    step = min(max(inv.sequence_step, 1), 3)
    key = {1: "gentle_nudge", 2: "polite_followup", 3: "final_checkin"}.get(
        step, "polite_followup"
    )
    body = render_whatsapp_body(
        step - 1,
        name=ctx.client_name,
        number=inv.doc_number,
        amount=f"${inv.balance:,.2f}",
        link=inv.payment_link or "",
    )
    return GeneratedMessage(subject="", body=body, whatsapp_template_key=key)


def _parse_generated(raw: str) -> GeneratedMessage | None:
    """Extract a clean subject/body from a model response, or None if unusable."""
    candidates = [raw]
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    if match:
        candidates.append(match.group())
    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except json.JSONDecodeError:
            continue
        subject = str(data.get("subject", "")).strip()
        body = str(data.get("body", "")).strip()
        if subject and body and not _contains_banned(subject + body):
            return GeneratedMessage(subject=subject, body=body)
    return None


def _try_kimi(system: str, user: str, model: str | None) -> GeneratedMessage | None:
    """Attempt generation with Kimi, retrying once on a bad response."""
    for _ in range(2):
        raw = call_kimi(user, system=system, model=model)
        if raw is None:
            return None
        result = _parse_generated(raw)
        if result is not None:
            return result
    return None


def _try_zai(system: str, user: str) -> GeneratedMessage | None:
    raw = call_zai(user, system=system)
    if raw is None:
        return None
    return _parse_generated(raw)


def generate_message(
    ctx: ReminderContext,
    tone: Tone,
    *,
    channel: Channel = Channel.EMAIL,
) -> GeneratedMessage:
    if channel == Channel.WHATSAPP:
        return generate_whatsapp_message(ctx, tone)

    system, user = build_reminder_prompts(ctx, tone)

    settings = get_settings()

    # Priority plans get the higher-tier Kimi model when configured.
    from app.services.plan_gating import normalize_plan

    priority_plan = normalize_plan(ctx.user_plan) in {"pro_plus", "team"}
    kimi_model = settings.kimi_model_priority if priority_plan else None

    result = _try_kimi(system, user, kimi_model)
    if result is not None:
        return _finalize(result, ctx.sender_name)

    result = _try_zai(system, user)
    if result is not None:
        return _finalize(result, ctx.sender_name)

    return _fallback_message(ctx, tone)

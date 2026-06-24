import json
import logging
import re
import time

from gentletap.config import get_settings
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.plans import has_priority_ai
from gentletap.integrations.openai.client import get_openai_client, get_zai_client
from gentletap.intelligence.prompt_builder import build_reminder_prompts
from gentletap.intelligence.schemas import BANNED_PHRASES, Channel, GeneratedMessage, ReminderContext, Tone
from gentletap.utils.ai_rate_limit import acquire_ai_slot

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
    """WhatsApp uses Meta-approved templates — not free-form AI text."""
    payload = wa_templates.build_payload(ctx, sender_name=ctx.sender_name, tone=tone)
    return GeneratedMessage(
        subject=f"WhatsApp · {payload.template_key}",
        body=payload.preview_body,
        whatsapp_template_key=payload.template_key,
    )


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


def _try_provider(client, model: str, system: str, user: str) -> GeneratedMessage | None:
    """Attempt generation with one provider, retrying once on a bad response."""
    for _ in range(2):
        if not acquire_ai_slot():
            time.sleep(1.0)
            if not acquire_ai_slot():
                logger.warning("AI rate limit exceeded; skipping provider %s", model)
                return None
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
        except Exception:
            # Provider down / bad key / wrong model — let the caller try the next one.
            logger.exception("AI provider %s failed during generation", model)
            return None
        result = _parse_generated(response.choices[0].message.content or "{}")
        if result is not None:
            return result
    return None


def generate_message(
    ctx: ReminderContext,
    tone: Tone,
    *,
    channel: Channel = Channel.EMAIL,
) -> GeneratedMessage:
    if channel == Channel.WHATSAPP:
        return generate_whatsapp_message(ctx, tone)

    settings = get_settings()

    system, user = build_reminder_prompts(ctx, tone)

    # Try providers in order: Kimi first, then z.ai (GLM), then a templated fallback.
    # Any provider being down, mis-keyed, or returning junk silently rolls to the next.
    kimi_model = (
        settings.kimi_model_priority
        if has_priority_ai(ctx.user_plan)
        else settings.kimi_model
    )
    providers: list[tuple[object, str]] = []
    kimi_client = get_openai_client()
    if kimi_client is not None:
        providers.append((kimi_client, kimi_model))
    zai_client = get_zai_client()
    if zai_client is not None:
        providers.append((zai_client, settings.zai_model))

    for client, model in providers:
        result = _try_provider(client, model, system, user)
        if result is not None:
            return _finalize(result, ctx.sender_name)

    return _fallback_message(ctx, tone)

import json
import re

from gentletap.config import get_settings
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.plans import has_priority_ai
from gentletap.integrations.openai.client import get_openai_client
from gentletap.intelligence.schemas import BANNED_PHRASES, Channel, GeneratedMessage, ReminderContext, Tone


def _tone_instruction(tone: Tone) -> str:
    mapping = {
        Tone.WARM: "warm and light — like a friendly heads-up",
        Tone.FRIENDLY: "friendly and helpful — assume they forgot",
        Tone.PROFESSIONAL: "professional and direct — clear about the overdue status",
        Tone.FIRM: "firm but respectful — include a clear deadline",
        Tone.URGENT: "urgent and human — suggest personal follow-up may be needed soon",
    }
    return mapping[tone]


def _contains_banned(text: str) -> bool:
    lower = text.lower()
    return any(phrase in lower for phrase in BANNED_PHRASES)


def _fallback_message(ctx: ReminderContext, tone: Tone) -> GeneratedMessage:
    inv = ctx.invoice
    due_str = inv.due_date.strftime("%B %d, %Y") if inv.due_date else "the due date"
    overdue = f" ({inv.days_overdue} days overdue)" if inv.days_overdue > 0 else ""
    subject = f"Invoice #{inv.doc_number} — payment reminder"
    if tone in (Tone.FIRM, Tone.URGENT):
        subject = f"Action needed: invoice #{inv.doc_number}"
    body = (
        f"Hi {ctx.client_name},\n\n"
        f"This is a reminder that invoice #{inv.doc_number} for ${inv.balance:,.2f} "
        f"was due on {due_str}{overdue}.\n\n"
        f"{_tone_instruction(tone).capitalize()}.\n\n"
        f"Please let me know if you have any questions.\n\nBest regards"
    )
    return GeneratedMessage(subject=subject, body=body)


def generate_whatsapp_message(ctx: ReminderContext, tone: Tone) -> GeneratedMessage:
    """WhatsApp uses Meta-approved templates — not free-form AI text."""
    payload = wa_templates.build_payload(ctx, sender_name=ctx.sender_name, tone=tone)
    return GeneratedMessage(
        subject=f"WhatsApp · {payload.template_key}",
        body=payload.preview_body,
        whatsapp_template_key=payload.template_key,
    )


def generate_message(
    ctx: ReminderContext,
    tone: Tone,
    *,
    channel: Channel = Channel.EMAIL,
) -> GeneratedMessage:
    if channel == Channel.WHATSAPP:
        return generate_whatsapp_message(ctx, tone)

    settings = get_settings()
    client = get_openai_client()
    if client is None:
        return _fallback_message(ctx, tone)

    inv = ctx.invoice
    profile = ctx.profile
    due_str = inv.due_date.strftime("%B %d, %Y")
    system = (
        "You write payment reminder emails for freelancers. "
        "Never use words like collections, debt collector, demand notice, overdue notice, or legal action. "
        "Keep emails concise, human, and relationship-preserving. "
        "Respond with JSON only: {\"subject\": \"...\", \"body\": \"...\"}"
    )
    user = (
        f"Client: {ctx.client_name}\n"
        f"Invoice #{inv.doc_number} — ${inv.balance:,.2f} {inv.currency}\n"
        f"Due date: {due_str}\n"
        f"Days overdue: {inv.days_overdue}\n"
        f"Sequence step: {inv.sequence_step}\n"
        f"Late payment rate: {profile.late_payment_rate:.0%}\n"
        f"Client tenure: {profile.tenure_months} months\n"
        f"Tone: {_tone_instruction(tone)}\n"
        "Write the reminder email."
    )

    for _ in range(2):
        model = (
            settings.kimi_model_priority
            if has_priority_ai(ctx.user_plan)
            else settings.kimi_model
        )
        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
            response_format={"type": "json_object"},
            temperature=0.7,
        )
        raw = response.choices[0].message.content or "{}"
        try:
            data = json.loads(raw)
            subject = str(data.get("subject", "")).strip()
            body = str(data.get("body", "")).strip()
            if subject and body and not _contains_banned(subject + body):
                return GeneratedMessage(subject=subject, body=body)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                try:
                    data = json.loads(match.group())
                    subject = str(data.get("subject", "")).strip()
                    body = str(data.get("body", "")).strip()
                    if subject and body and not _contains_banned(subject + body):
                        return GeneratedMessage(subject=subject, body=body)
                except json.JSONDecodeError:
                    pass

    return _fallback_message(ctx, tone)

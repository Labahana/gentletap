"""AI provider abstraction with Kimi → Z.AI → static template fallback chain."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date
from typing import Any, Dict, List, Optional

from app.services.ai.kimi import call_kimi
from app.services.ai.zai import call_zai
from app.services.ai.tones import contains_banned_phrases
from app.services.ai.templates import render_static_body, render_static_subject

logger = logging.getLogger(__name__)

REMINDER_PROMPT = """You write payment reminder emails for a small business owner.
Tone: {tone}  (warm|friendly|professional|firm|urgent)
Invoice number: {invoice_number}
Amount: {amount} {currency}
Due date: {due_date}
Days overdue: {days_overdue}
Client first name: {client_first_name}
Client relationship: {relationship_context}
Payment link: {payment_link}
Business owner name: {owner_name}

Write an email body (no subject) 40–80 words, first-person from the business owner.
Rules:
- Natural, human, never robotic or corporate.
- Reference the invoice number, amount, and days overdue.
- Escalate only through clarity and consistency, never aggression.
- NEVER use these words or their variants: collections, demand notice, overdue notice, legal action, attorney, lawsuit, penalty, final warning.
- Do not claim things that are untrue (e.g. don't state fees that don't exist).
- End with a clear next step (payment link or a request for a payment date).
- For tone 'warm': assume good intent, check in casually.
- For tone 'friendly': polite nudge, offer help.
- For tone 'professional': direct, clear, business-casual.
- For tone 'firm': insist on timeline, mention owner will follow up.
- For tone 'urgent': request a reply with an ETA, mention the owner will follow up personally, but stay polite.
"""


@dataclass
class ReminderDraft:
    subject: str
    body: str
    provider: str  # kimi | zai | template


def _days_overdue(due_date: Optional[date]) -> int:
    if not due_date:
        return 0
    delta = date.today() - due_date
    return max(0, delta.days)


def _build_context(
    invoice: Any,
    client: Any,
    client_profile: Any,
    tone: str,
    owner_name: str,
    payment_link: str = "",
) -> Dict[str, Any]:
    first_name = (client.name or "there").split()[0]
    score = getattr(client_profile, "reliability_score", 100) if client_profile else 100
    return {
        "tone": tone,
        "invoice_number": invoice.number,
        "amount": f"{float(invoice.amount):,.2f}",
        "currency": invoice.currency or "USD",
        "due_date": str(invoice.due_date) if invoice.due_date else "N/A",
        "days_overdue": _days_overdue(invoice.due_date),
        "client_first_name": first_name,
        "relationship_context": f"reliability score {score}/100",
        "payment_link": payment_link or "the payment link on your invoice",
        "owner_name": owner_name or "Your Team",
    }


def _try_provider(provider_fn, prompt: str, label: str) -> Optional[str]:
    body = provider_fn(prompt)
    if not body:
        return None
    if contains_banned_phrases(body):
        logger.warning("%s output contained banned phrases; discarding", label)
        return None
    return body


def generate_reminder(
    invoice: Any,
    client: Any,
    client_profile: Any,
    step_index: int,
    tone: str,
    history: Optional[List[Any]] = None,
    owner_name: str = "Your Team",
    payment_link: str = "",
) -> ReminderDraft:
    """
    Returns subject + body via chain: Kimi -> Z.AI -> Static Template.
    Retries once on banned phrases per provider before falling through.
    """
    ctx = _build_context(invoice, client, client_profile, tone, owner_name, payment_link)
    prompt = REMINDER_PROMPT.format(**ctx)
    subject = render_static_subject(tone, ctx)

    # 1) Kimi primary (retry once on banned)
    for _ in range(2):
        body = _try_provider(call_kimi, prompt, "kimi")
        if body:
            return ReminderDraft(subject=subject, body=body, provider="kimi")

    # 2) Z.AI fallback
    for _ in range(2):
        body = _try_provider(call_zai, prompt, "zai")
        if body:
            return ReminderDraft(subject=subject, body=body, provider="zai")

    # 3) Static template (guaranteed clean)
    body = render_static_body(tone, ctx)
    return ReminderDraft(subject=subject, body=body, provider="template")

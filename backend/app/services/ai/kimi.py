"""Kimi (Moonshot) LLM client — primary AI provider."""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def call_kimi(
    prompt: str,
    system: str = "You write concise payment reminder emails.",
    model: Optional[str] = None,
) -> Optional[str]:
    if not settings.kimi_api_key:
        logger.info("Kimi API key missing; skipping primary provider")
        return None

    headers = {
        "Authorization": f"Bearer {settings.kimi_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model or settings.kimi_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
    }
    try:
        with httpx.Client(timeout=float(settings.kimi_timeout_seconds)) as client:
            res = client.post(
                f"{settings.kimi_api_base.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
            logger.warning("Kimi API status %s: %s", res.status_code, res.text[:200])
    except Exception as exc:
        logger.warning("Kimi API failed: %s", exc)
    return None


def generate_template_with_kimi(
    tone: str,
    context: Optional[str] = None,
    client_name: Optional[str] = None,
    invoice_number: Optional[str] = None,
    amount: Optional[float] = None,
):
    """Phase 1 compatibility: return subject/body dict for Templates UI."""
    import json
    from app.services.ai.templates import get_static_template

    if not settings.kimi_api_key:
        return get_static_template(tone)

    prompt = (
        f"Generate a payment reminder email template as JSON with keys subject and body.\n"
        f"Tone: {tone}. Use placeholders {{client_name}}, {{invoice_number}}, {{amount}}, "
        f"{{due_date}}, {{days_overdue}}.\n"
        f"Context: {context or 'Standard reminder'}. "
        f"Client: {client_name or 'Client'}, Invoice: {invoice_number or 'N/A'}, Amount: {amount or 0}.\n"
        f"Return ONLY valid JSON."
    )
    content = call_kimi(prompt, system="You output JSON only.")
    if content:
        try:
            # Strip markdown fences if present
            cleaned = content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[-1]
                if cleaned.endswith("```"):
                    cleaned = cleaned.rsplit("```", 1)[0]
            parsed = json.loads(cleaned)
            if "subject" in parsed and "body" in parsed:
                return {"subject": parsed["subject"], "body": parsed["body"]}
        except Exception:
            pass
    return get_static_template(tone)

"""OpenAI LLM client — optional provider (used when OPENAI_API_KEY is set)."""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def call_openai(
    prompt: str,
    system: str = "You write concise payment reminder emails.",
    model: Optional[str] = None,
) -> Optional[str]:
    if not settings.openai_api_key:
        logger.info("OPENAI_API_KEY missing; skipping OpenAI provider")
        return None

    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": model or settings.openai_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
    }
    try:
        with httpx.Client(timeout=30.0) as client:
            res = client.post(
                f"{settings.openai_api_base.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
            logger.warning("OpenAI API status %s: %s", res.status_code, res.text[:200])
    except Exception as exc:
        logger.warning("OpenAI API failed: %s", exc)
    return None

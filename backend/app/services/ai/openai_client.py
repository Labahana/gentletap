"""OpenAI LLM client — optional provider (used when OPENAI_API_KEY is set)."""

from __future__ import annotations

import logging
from typing import Optional

from app.config import get_settings
from app.services.ai._retry import post_chat_json

logger = logging.getLogger(__name__)
settings = get_settings()


def call_openai(
    prompt: str,
    system: str = "You write concise payment reminder emails.",
    model: Optional[str] = None,
    timeout: Optional[float] = None,
    retries: int = 0,
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
    return post_chat_json(
        label="OpenAI",
        url=f"{settings.openai_api_base.rstrip('/')}/chat/completions",
        headers=headers,
        payload=payload,
        timeout=timeout if timeout is not None else 30.0,
        retries=retries,
    )

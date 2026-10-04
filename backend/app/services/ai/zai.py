"""Z.AI (Zhipu GLM) LLM client — fallback AI provider."""

from __future__ import annotations

import logging
from typing import Optional

from app.config import get_settings
from app.services.ai._retry import post_chat_json

logger = logging.getLogger(__name__)
settings = get_settings()


def call_zai(
    prompt: str,
    system: str = "You write concise payment reminder emails.",
    timeout: Optional[float] = None,
    retries: int = 0,
) -> Optional[str]:
    if not settings.zai_api_key:
        logger.info("Z.AI API key missing; skipping fallback provider")
        return None

    headers = {
        "Authorization": f"Bearer {settings.zai_api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": settings.zai_model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.7,
    }
    return post_chat_json(
        label="Z.AI",
        url=f"{settings.zai_api_base.rstrip('/')}/chat/completions",
        headers=headers,
        payload=payload,
        timeout=timeout if timeout is not None else float(settings.zai_timeout_seconds),
        retries=retries,
    )

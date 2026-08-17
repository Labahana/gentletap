"""Z.AI (Zhipu GLM) LLM client — fallback AI provider."""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()


def call_zai(prompt: str, system: str = "You write concise payment reminder emails.") -> Optional[str]:
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
    try:
        with httpx.Client(timeout=float(settings.zai_timeout_seconds)) as client:
            res = client.post(
                f"{settings.zai_api_base.rstrip('/')}/chat/completions",
                headers=headers,
                json=payload,
            )
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
            logger.warning("Z.AI API status %s: %s", res.status_code, res.text[:200])
    except Exception as exc:
        logger.warning("Z.AI API failed: %s", exc)
    return None

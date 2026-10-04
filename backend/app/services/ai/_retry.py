"""Bounded retry for the OpenAI-compatible LLM provider calls.

A brief provider blip (429 overloaded, 5xx, network/timeout) shouldn't force the
chatbot's "can't reach my brain" fallback, so we give transient failures a couple
of fast retries with backoff and honour a small Retry-After. Anything non-
transient (400/401/403/404) or an exhausted budget returns None so the provider
chain moves on to the next one. Centralised here so openai/kimi/zai stay in sync.
"""

from __future__ import annotations

import logging
import random
import time
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

TRANSIENT_STATUS = frozenset({429, 500, 502, 503, 504})
_MAX_SINGLE_BACKOFF = 3.0


def _retry_after_seconds(res: httpx.Response) -> Optional[float]:
    raw = res.headers.get("Retry-After")
    if not raw:
        return None
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def post_chat_json(
    *,
    label: str,
    url: str,
    headers: dict,
    payload: dict,
    timeout: float,
    retries: int = 0,
    backoff_base: float = 0.6,
) -> Optional[str]:
    attempt = 0
    while True:
        transient = False
        delay: Optional[float] = None
        detail = "unknown"
        try:
            with httpx.Client(timeout=timeout) as client:
                res = client.post(url, headers=headers, json=payload)
            if res.status_code == 200:
                return res.json()["choices"][0]["message"]["content"].strip()
            detail = f"status {res.status_code}: {res.text[:200]}"
            if res.status_code in TRANSIENT_STATUS:
                transient = True
                ra = _retry_after_seconds(res)
                delay = ra if ra is not None else backoff_base * (2**attempt)
        except httpx.HTTPError as exc:  # network / timeout / transport
            transient = True
            detail = f"network: {exc}"
            delay = backoff_base * (2**attempt)
        except Exception as exc:  # noqa: BLE001 - bad body/shape, not worth retrying
            logger.warning("%s API error: %s", label, exc)
            return None

        if transient and attempt < retries:
            attempt += 1
            wait = min(_MAX_SINGLE_BACKOFF, delay or backoff_base * (2**attempt))
            time.sleep(wait + random.random() * 0.1)
            continue

        if transient:
            logger.warning("%s API failed after %d attempt(s): %s", label, attempt + 1, detail)
        else:
            logger.warning("%s API %s", label, detail)
        return None

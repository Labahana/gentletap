"""Chat LLM call reusing the existing provider chain (OpenAI → Kimi → Z.AI).

The provider clients here are prompt-in/text-out, so conversation history is
folded into a single user turn by the caller (see prompts.build_user_prompt).
Returns the parsed control dict; callers always get a usable dict even on total
provider failure (fallback reply + escalate) so the chat never hard-errors.
"""

from __future__ import annotations

import json
import logging
import re
from typing import Optional

from app.config import get_settings
from app.services.ai.kimi import call_kimi
from app.services.ai.openai_client import call_openai
from app.services.ai.zai import call_zai

logger = logging.getLogger(__name__)

_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)


def _parse(raw: Optional[str]) -> Optional[dict]:
    if not raw:
        return None
    candidates = [raw]
    match = _JSON_RE.search(raw)
    if match:
        candidates.append(match.group())
    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except (json.JSONDecodeError, TypeError):
            continue
        if isinstance(data, dict) and "reply" in data:
            conf = data.get("confidence")
            try:
                conf = float(conf) if conf is not None else None
            except (TypeError, ValueError):
                conf = None
            return {
                "reply": str(data.get("reply", "")).strip(),
                "intent": (str(data.get("intent", "")).strip() or None),
                "sentiment": (str(data.get("sentiment", "")).strip() or None),
                "confidence": conf,
                "escalate": bool(data.get("escalate", False)),
                "suggested_resolution": (str(data.get("suggested_resolution", "")).strip() or None),
                "sources": data.get("sources") if isinstance(data.get("sources"), list) else [],
            }
    # Treat a plain-text reply (model ignored JSON) as a valid answer, unknown confidence.
    return {
        "reply": raw.strip()[:1500],
        "intent": None,
        "sentiment": None,
        "confidence": None,
        "escalate": False,
        "suggested_resolution": None,
        "sources": [],
    }


def _model_for_plan(plan: Optional[str]) -> tuple[Optional[str], Optional[str]]:
    settings = get_settings()
    from app.services.plan_gating import normalize_plan

    priority = normalize_plan(plan or "") in {"pro_plus", "team"}
    return (
        (settings.openai_model_priority if priority else None),
        (settings.kimi_model_priority if priority else None),
    )


def chat_completion(system: str, user: str, *, plan: Optional[str] = None) -> dict:
    openai_model, kimi_model = _model_for_plan(plan)
    settings = get_settings()
    timeout = float(settings.chat_timeout_seconds)
    retries = int(settings.chat_provider_retries)

    result = _parse(call_openai(user, system=system, model=openai_model, timeout=timeout, retries=retries))
    if result:
        return result
    result = _parse(call_kimi(user, system=system, model=kimi_model, timeout=timeout, retries=retries))
    if result:
        return result
    result = _parse(call_zai(user, system=system, timeout=timeout, retries=retries))
    if result:
        return result

    logger.warning("chat: all providers failed; returning safe fallback")
    return {
        "reply": (
            "I'm sorry — I'm having trouble reaching my brain right now. "
            "I've let a human teammate know so someone can help you personally."
        ),
        "intent": None,
        "sentiment": None,
        "confidence": 0.0,
        "escalate": True,
        "suggested_resolution": "AI providers unavailable; a human should follow up with this user.",
        "sources": [],
    }

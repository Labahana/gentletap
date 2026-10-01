"""Deterministic escalation triggers for the chatbot.

Handoff decisions must not rest on the model alone. These pure functions catch
explicit "talk to a human" requests and sensitive/high-stakes topics regardless
of model output, and combine them with the model's own confidence/escalate flags.
"""

from __future__ import annotations

import re
from typing import List, Optional

_EXPLICIT = re.compile(
    r"\b(human|person|someone|agent|representative|support|staff|team member|real person|"
    r"talk to (?:someone|a person|an agent)|speak to (?:someone|a person)|hand me off|escalate)\b",
    re.IGNORECASE,
)
_SENSITIVE = re.compile(
    r"\b(refund|chargeback|dispute|cancel (?:my )?(?:account|subscription)|delete (?:my )?account|"
    r"lawsuit|legal|compliance|gdpr|data (?:export|breach|protection)|privacy|security|breach|"
    r"invoice (?:is wrong|mistake)|unauthorized|fraud|cancel my (?:plan|billing))\b",
    re.IGNORECASE,
)
_NEGATIVE = re.compile(
    r"\b(angry|furious|unacceptable|terrible|awful|worst|hate|frustrated|frustrating|"
    r"useless|broken|scam|rip ?off|complaint|complained|never works|not working|no response|"
    r"escalate|manager|lawyer)\b",
    re.IGNORECASE,
)

# Confidence below this (and the model didn't already flag escalation) → offer handoff.
LOW_CONFIDENCE_THRESHOLD = 0.45
# Same topic failed this many times in a session → escalate.
REPEATED_FAILURE_LIMIT = 2


def wants_human(text: str) -> bool:
    return bool(_EXPLICIT.search(text or ""))


def is_sensitive(text: str) -> bool:
    return bool(_SENSITIVE.search(text or ""))


def is_negative(text: str) -> bool:
    return bool(_NEGATIVE.search(text or ""))


def decide_escalation(
    *,
    user_text: str,
    model_escalate: bool = False,
    confidence: Optional[float] = None,
    negative_sentiment: bool = False,
    consecutive_low_confidence: int = 0,
) -> Optional[str]:
    """Return a trigger string if the bot must escalate, else None.

    Priority: explicit request > sensitive topic > model-escalate > negative
    sentiment > repeated low-confidence.
    """
    if wants_human(user_text):
        return "explicit_request"
    if is_sensitive(user_text):
        return "sensitive_topic"
    if model_escalate:
        return "model_flagged"
    if negative_sentiment or is_negative(user_text):
        return "negative_sentiment"
    if confidence is not None and confidence < LOW_CONFIDENCE_THRESHOLD:
        return "low_confidence"
    if consecutive_low_confidence >= REPEATED_FAILURE_LIMIT:
        return "repeated_failure"
    return None


def build_context_package(
    *,
    narrative: str,
    intent: Optional[str],
    sentiment: Optional[str],
    trigger: str,
    transcript: List[dict],
    account_summary: Optional[dict],
    suggested_resolution: Optional[str],
    sources: Optional[List[str]] = None,
) -> dict:
    """The structured payload an admin needs to act without re-asking the user."""
    recent = [
        {"role": m.get("role"), "content": (m.get("content") or "")[:500]}
        for m in transcript[-10:]
    ]
    return {
        "narrative": narrative,
        "intent": intent,
        "sentiment": sentiment,
        "trigger": trigger,
        "suggested_resolution": suggested_resolution,
        "account": account_summary or {},
        "sources": sources or [],
        "transcript": recent,
    }

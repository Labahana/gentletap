"""Banned phrases and tone selection for GentleTap reminders."""

from __future__ import annotations

from typing import Optional

BANNED_PHRASES = [
    "collections",
    "demand notice",
    "overdue notice",
    "legal action",
    "attorney",
    "lawsuit",
    "penalty",
    "final warning",
]

TONES = ["warm", "friendly", "professional", "firm", "urgent"]

DEFAULT_TONE_BY_DAY = {
    0: "warm",
    3: "friendly",
    7: "professional",
    14: "firm",
    21: "urgent",
}

TONE_RANK = {t: i for i, t in enumerate(TONES)}


def contains_banned_phrases(text: str) -> bool:
    lowered = (text or "").lower()
    return any(phrase in lowered for phrase in BANNED_PHRASES)


def soften_tone(tone: str) -> str:
    idx = TONE_RANK.get(tone, 1)
    return TONES[max(0, idx - 1)]


def select_tone(
    day_offset: int,
    reliability_score: int = 100,
    dispute_count: int = 0,
    tone_pref: Optional[str] = None,
) -> str:
    """Pick tone for a sequence step, adjusted by client profile."""
    if tone_pref and tone_pref in TONE_RANK:
        return tone_pref

    # Nearest default day bucket
    tone = "urgent"
    for day in sorted(DEFAULT_TONE_BY_DAY.keys()):
        if day_offset <= day:
            tone = DEFAULT_TONE_BY_DAY[day]
            break
    else:
        tone = "urgent"

    if reliability_score > 80:
        tone = soften_tone(tone)

    if dispute_count > 0 and tone == "urgent":
        tone = "firm"

    return tone

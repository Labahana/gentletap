"""Detect when a client claims they paid (not verified until QuickBooks sync)."""

import re

_PAYMENT_CLAIM = re.compile(
    r"\b("
    r"paid|"
    r"payment\s+sent|"
    r"sent\s+(the\s+)?payment|"
    r"transferred|"
    r"transfer\s+sent|"
    r"money\s+sent|"
    r"already\s+paid|"
    r"just\s+paid|"
    r"paid\s+it|"
    r"paid\s+in\s+full|"
    r"i\s+paid|"
    r"i'?ve\s+paid|"
    r"ive\s+paid|"
    r"made\s+(the\s+)?payment|"
    r"completed\s+(the\s+)?payment"
    r")\b",
    re.IGNORECASE,
)


def is_payment_claim(text: str) -> bool:
    cleaned = (text or "").strip()
    if not cleaned:
        return False
    return bool(_PAYMENT_CLAIM.search(cleaned))

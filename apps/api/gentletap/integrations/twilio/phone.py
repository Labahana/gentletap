"""E.164 / WhatsApp address normalization."""

import re

_NON_DIGIT = re.compile(r"[^\d+]")


def normalize_phone_e164(phone: str | None) -> str | None:
    if not phone:
        return None
    raw = phone.strip()
    if raw.startswith("whatsapp:"):
        raw = raw.split(":", 1)[1]
    raw = _NON_DIGIT.sub("", raw)
    if not raw:
        return None
    if not raw.startswith("+"):
        if raw.startswith("1") and len(raw) == 11:
            raw = f"+{raw}"
        else:
            raw = f"+{raw}"
    return raw


def phones_match(a: str | None, b: str | None) -> bool:
    na = normalize_phone_e164(a)
    nb = normalize_phone_e164(b)
    if not na or not nb:
        return False
    return na == nb or na.lstrip("+") == nb.lstrip("+")


def whatsapp_sender_id(phone_e164: str) -> str:
    phone = normalize_phone_e164(phone_e164) or phone_e164
    return phone if phone.startswith("whatsapp:") else f"whatsapp:{phone}"

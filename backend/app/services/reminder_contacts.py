"""Hybrid contact resolution for reminder delivery.

Email is always per-client. WhatsApp uses a per-invoice override when present,
otherwise the client's phone as a default — both normalized to E.164. A number
that cannot be normalized is treated as "missing" so the invoice falls back to
email-only and is surfaced for the user to fix, rather than sending to a wrong
destination.
"""
import re

# E.164: leading +, country code 1-9, then up to 14 more digits (max 15 total).
_E164_RE = re.compile(r"^\+[1-9]\d{6,14}$")


def normalize_phone_e164(raw):
    if not raw:
        return None
    value = str(raw).strip()
    if not value:
        return None

    had_plus = value.startswith("+")
    digits = re.sub(r"\D", "", value)
    if not digits:
        return None

    if had_plus:
        candidate = "+" + digits
    elif len(digits) == 11 and digits.startswith("1"):
        # North American Numbering Plan with country code.
        candidate = "+" + digits
    elif len(digits) == 10:
        # Bare US/CA number — assume +1.
        candidate = "+1" + digits
    else:
        # Ambiguous and international-looking without a '+': reject rather than guess.
        return None

    return candidate if _E164_RE.match(candidate) else None


def effective_reminder_phone(invoice, client=None):
    """Resolve the WhatsApp recipient: per-invoice override, else client default."""
    override = normalize_phone_e164(getattr(invoice, "reminder_phone", None))
    if override:
        return override
    return normalize_phone_e164(getattr(client, "phone", None))


def effective_reminder_email(client):
    email = (getattr(client, "email", None) or "").strip() if client else ""
    return email or None

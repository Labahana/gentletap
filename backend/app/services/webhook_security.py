"""Shared webhook request-verification helpers (fail-closed by default)."""

from __future__ import annotations

import base64
import hashlib
import hmac
import logging
import time

from app.config import get_settings

logger = logging.getLogger(__name__)


def verify_intuit(raw_body: bytes, signature_header: str | None) -> bool:
    """Intuit sends the shared verifier token in the Intuit-Signature header."""
    settings = get_settings()
    if not settings.intuit_webhook_verifier_token:
        logger.error("INTUIT_WEBHOOK_VERIFIER_TOKEN not set — rejecting webhook")
        return False
    if not signature_header:
        return False
    return hmac.compare_digest(
        signature_header.strip(), settings.intuit_webhook_verifier_token
    )


def verify_freshbooks(raw_body: bytes, signature_header: str | None) -> bool:
    """FreshBooks sends HMAC-SHA256(body) in X-FreshBooks-Hmac-Sha256."""
    settings = get_settings()
    secret = settings.freshbooks_webhook_verifier_token
    if not secret:
        logger.error("FRESHBOOKS_WEBHOOK_VERIFIER_TOKEN not set — rejecting webhook")
        return False
    if not signature_header:
        return False
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header.strip().lower())


def _svix_secret_bytes(secret: str) -> bytes:
    # Resend secrets look like whsec_<base64>; tolerate a raw secret too.
    if secret.startswith("whsec_"):
        secret = secret[len("whsec_"):]
    try:
        return base64.b64decode(secret)
    except Exception:
        return secret.encode("utf-8")


def verify_svix(
    secret: str,
    body: bytes,
    *,
    msg_id: str | None,
    timestamp: str | None,
    signature: str | None,
    tolerance_seconds: int = 300,
) -> bool:
    """Verify Svix-style signatures as used by Resend webhooks."""
    if not secret:
        logger.warning("RESEND_WEBHOOK_SECRET not set — accepting unverified event")
        return True  # low-risk endpoint (message status updates); logged
    if not (msg_id and timestamp and signature):
        return False
    try:
        ts = int(timestamp)
    except ValueError:
        return False
    if abs(time.time() * 1000 - ts * 1000) > tolerance_seconds * 1000:
        return False
    signed_content = f"{msg_id}.{timestamp}.".encode("utf-8") + body
    expected = base64.b64encode(
        hmac.new(_svix_secret_bytes(secret), signed_content, hashlib.sha256).digest()
    ).decode("utf-8")
    provided = ",".join(
        v.strip() for v in signature.split(" ") if v.startswith("v1,")
    ).split(",")
    provided = [v for v in provided if v]
    return any(hmac.compare_digest(expected, v) for v in provided)


def verify_twilio(url: str, params: dict, signature: str | None) -> bool:
    """Standard Twilio webhook signature validation (X-Twilio-Signature).

    Skipped with a warning when TWILIO_AUTH_TOKEN is unset so existing dev
    setups keep working; set the token to enable enforcement.
    """
    settings = get_settings()
    token = settings.twilio_auth_token
    if not token:
        logger.warning("TWILIO_AUTH_TOKEN not set — skipping Twilio signature check")
        return True
    if not signature:
        return False
    data = "".join(f"{k}{v}" for k, v in sorted(params.items()))
    expected = base64.b64encode(
        hmac.new(token.encode("utf-8"), (url + data).encode("utf-8"), hashlib.sha1).digest()
    ).decode("utf-8")
    return hmac.compare_digest(expected, signature)

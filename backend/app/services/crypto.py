"""Symmetric encryption at rest for stored OAuth tokens.

Uses Fernet (AES-128-CBC + HMAC) keyed by TOKEN_ENCRYPTION_KEY, or a key derived
from SECRET_KEY when the dedicated key is unset. Values that were stored before
this layer existed are read back as plaintext (backward compatible) and get
re-encrypted on their next write. Mock/dev tokens are passed through untouched
so dev-mode checks like startswith("mock_") keep working after decryption.
"""

from __future__ import annotations

import base64
import hashlib
import logging

from cryptography.fernet import Fernet, InvalidToken

from app.config import get_settings

logger = logging.getLogger(__name__)

_PREFIX = "enc:v1:"


def _fernet() -> Fernet | None:
    settings = get_settings()
    key = (settings.token_encryption_key or "").strip()
    if not key:
        # Derive a stable key from SECRET_KEY so encryption works out of the box.
        secret = (settings.secret_key or "").strip()
        if not secret:
            logger.warning("No TOKEN_ENCRYPTION_KEY or SECRET_KEY set; tokens stored unencrypted")
            return None
        digest = hashlib.sha256(secret.encode("utf-8")).digest()
        key = base64.urlsafe_b64encode(digest).decode("utf-8")
    try:
        return Fernet(key.encode("utf-8"))
    except Exception:
        logger.exception("Invalid TOKEN_ENCRYPTION_KEY (must be 32-byte urlsafe base64)")
        return None


def is_mock(value: str | None) -> bool:
    return bool(value) and str(value).startswith("mock_")


def encrypt_secret(value: str | None) -> str:
    """Encrypt a secret for storage. Idempotent for already-encrypted values."""
    if not value:
        return value or ""
    if is_mock(value) or value.startswith(_PREFIX):
        return value
    f = _fernet()
    if f is None:
        return value
    try:
        return _PREFIX + f.encrypt(value.encode("utf-8")).decode("utf-8")
    except Exception:
        logger.exception("Token encryption failed; storing as-is")
        return value


def decrypt_secret(value: str | None) -> str:
    """Decrypt a stored secret. Plaintext/legacy/mock values pass through."""
    if not value:
        return value or ""
    if is_mock(value) or not value.startswith(_PREFIX):
        return value
    f = _fernet()
    if f is None:
        logger.error("Encrypted token present but no encryption key configured")
        return ""
    try:
        return f.decrypt(value[len(_PREFIX):].encode("utf-8")).decode("utf-8")
    except InvalidToken:
        # Key rotated or wrong env — loud error beats silently sending a bad token.
        logger.error("Token decryption failed (key mismatch?). Reconnect the integration.")
        return ""

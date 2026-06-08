import base64
import hashlib

from cryptography.fernet import Fernet

from gentletap.config import get_settings


def _fernet() -> Fernet:
    settings = get_settings()
    key = settings.token_encryption_key
    if key:
        return Fernet(key.encode() if isinstance(key, str) else key)
    # Derive a stable dev key from secret_key when encryption key not set
    derived = base64.urlsafe_b64encode(
        hashlib.sha256(settings.secret_key.encode()).digest()
    )
    return Fernet(derived)


def encrypt_token(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt_token(cipher: str) -> str:
    return _fernet().decrypt(cipher.encode()).decode()

"""Production security audit for GentleTap.

Run on the VPS host (reads the same .env the containers use):
    cd /opt/gentletap
    docker compose run --rm api python scripts/security_check.py

Exit code 0 = pass, 1 = critical findings.
"""

import base64
import hashlib
import os
import sys
import urllib.parse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.config import get_settings  # noqa: E402

KNOWN_DEFAULTS = {
    "secret_key": {"your_secret_key_here", ""},
    "jwt_secret_key": {"your_jwt_secret_key_here", ""},  # noqa: S105
    "admin_api_key": {""},
    "token_encryption_key": set(),  # optional; derived from secret_key when empty
    "paddle_webhook_secret": {""},
    "resend_webhook_secret": {""},
    "intuit_webhook_verifier_token": {""},
}

# Values that were once committed to git history — must never be live again.
# Stored as SHA-256 fingerprints so this file does not re-publish the (already
# leaked) credential literals while still detecting if any of them is live.
BANNED_VALUE_HASHES = {
    "4ef9f113950012aea454f3b925ec87cb5c5a23707af88f88187accdfe33532c4",
    "8475d5aa03e8b6556e1ebcce40ecc22e27daf4a7d1926a3297852a464bd06aa2",
    "ba4b39e64856f2e7dd1a4514899d93bac85c1db132d474a8e5e8426ddbf0d76e",
    "ee0f48d1caa01062845aefeea69c1e2c4c7db389d57faa701cc2ff4323f930b8",
    "f18dc08167c5d00f1641c9f78905b10d5697b270ecda1956c437f333179712d2",  # old admin key default
}

# Weak example password from .env.example, compared by fingerprint (never inlined).
_PG_EXAMPLE_PASSWORD_HASH = "00666976ce4a8d66227ac9f328631c9eb2c715a17e2503629d49aa324f863a56"


def _sha(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def main() -> int:
    settings = get_settings()
    critical = []
    warnings = []

    print("== GentleTap production security audit ==\n")

    if settings.environment != "production":
        print("NOTE: ENVIRONMENT is not 'production'; audit still runs.\n")

    for attr, bad in KNOWN_DEFAULTS.items():
        value = str(getattr(settings, attr, "") or "")
        label = attr.upper()
        if value.strip() in bad and attr != "token_encryption_key":
            critical.append(f"{label} is empty or a known default")
        if value and _sha(value) in BANNED_VALUE_HASHES:
            critical.append(f"{label} uses a value that exists in git history — ROTATE IT")
        if attr == "token_encryption_key" and not value:
            warnings.append(
                "TOKEN_ENCRYPTION_KEY unset — connection tokens encrypted with a key "
                "derived from SECRET_KEY. Fine, but rotating SECRET_KEY invalidates "
                "stored OAuth tokens."
            )

    # Weak secret hygiene
    jwt = settings.jwt_secret_key or ""
    if len(jwt) < 32:
        critical.append("JWT_SECRET_KEY shorter than 32 chars — brute-forceable")
    if settings.secret_key and len(settings.secret_key) < 32:
        warnings.append("SECRET_KEY shorter than 32 chars")

    # Postgres/Redis default passwords from .env.example (compared by
    # fingerprint so the weak literal is not embedded in this file).
    db_url = settings.database_url or ""
    try:
        db_password = urllib.parse.urlparse(db_url).password or ""
    except ValueError:
        db_password = ""
    if db_password and _sha(db_password) == _PG_EXAMPLE_PASSWORD_HASH:
        critical.append("DATABASE_URL uses the documented example password")
    if "choose-a-strong-redis-password" in (settings.redis_url or ""):
        critical.append("REDIS_URL uses the documented example password")

    # Admin emails sanity
    if not settings.admin_emails:
        warnings.append("ADMIN_EMAILS empty — JWT admin path unusable (header key only)")

    for w in warnings:
        print(f"[warn] {w}")
    print()
    if critical:
        for c in critical:
            print(f"[CRITICAL] {c}")
        print(f"\nResult: FAIL ({len(critical)} critical, {len(warnings)} warnings)")
        return 1
    print(f"Result: PASS ({len(warnings)} warnings)")
    return 0


if __name__ == "__main__":
    sys.exit(main())

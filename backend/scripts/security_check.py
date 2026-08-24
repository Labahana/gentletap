"""Production security audit for GentleTap.

Run on the VPS host (reads the same .env the containers use):
    cd /opt/gentletap
    docker compose run --rm api python scripts/security_check.py

Exit code 0 = pass, 1 = critical findings.
"""

import base64
import os
import sys

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
BANNED_VALUES = {
    "B40skGXOXgvJnueLRRw_gB5aXFuL5Srdqms66Jz0yhQ=",
    "6304fd22-8256-4448-9070-eda70d91fb57",
    "whsec_1O602+LxpH1d/e9P/IovelwCkCb0fXr0",
    "pdl_ntfset_01kvz5wrmhv0rdhdpfem5je9p1_W99kVrMPxS4M8LBVJezwxKtRe7ssYCUH",
    "gentletap_admin_key_prod",
}


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
        if value in BANNED_VALUES:
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

    # Postgres/Redis default passwords from .env.example
    db_url = settings.database_url or ""
    if "gentletap_postgres_password" in db_url:
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

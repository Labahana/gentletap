"""Password reset tokens (stored in Redis) and email delivery."""

import secrets
from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import SessionLocal
from app.models.user import User
from app.services.redis_lock import get_redis
from app.services.email import send_email_via_resend

RESET_TTL = 3600


def _token_key(token: str) -> str:
    return f"password_reset:{token}"


def request_password_reset(db: Session, email: str) -> None:
    """Create a reset token and email the user. No-op silently if no account."""
    user = db.query(User).filter(User.email == email.lower()).first()
    if user is None:
        return

    token = secrets.token_urlsafe(32)
    try:
        get_redis().setex(_token_key(token), RESET_TTL, str(user.id))
    except Exception:
        # Redis unavailable — fall back to a signed JWT-style token stored
        # statelessly is not available here, so fail soft (no email sent).
        return

    settings = get_settings()
    reset_url = f"{settings.frontend_url.rstrip('/')}/reset-password?token={token}"
    first_name = user.full_name.split()[0] if user.full_name and user.full_name.strip() else ""
    greeting = f"Hi {first_name}," if first_name else "Hi,"
    body = (
        f"{greeting}\n\n"
        "We received a request to reset your GentleTap password. "
        "This link expires in 1 hour.\n\n"
        f"Reset your password: {reset_url}\n\n"
        "If you didn't request this, you can safely ignore this email."
    )
    send_email_via_resend(
        to_email=user.email,
        subject="Reset your GentleTap password",
        body=body,
    )


def reset_password(db: Session, *, token: str, new_password: str) -> None:
    try:
        stored = get_redis().get(_token_key(token))
    except Exception as exc:
        raise ValueError("This reset link is invalid or has expired") from exc
    if not stored:
        raise ValueError("This reset link is invalid or has expired")

    user = db.query(User).filter(User.id == UUID(str(stored))).one_or_none()
    if user is None:
        raise ValueError("User not found")

    from app.api.deps import hash_password

    user.password_hash = hash_password(new_password)
    try:
        get_redis().delete(_token_key(token))
    except Exception:
        pass
    db.commit()


def purge_expired_reset_tokens() -> int:
    """Housekeeping: Redis expires keys automatically; kept for parity/tests."""
    return 0


if __name__ == "__main__":  # pragma: no cover
    with SessionLocal() as session:
        request_password_reset(session, input("Email: ").strip())

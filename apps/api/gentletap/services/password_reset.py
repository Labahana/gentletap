"""Password reset tokens and email delivery."""

import secrets

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Profile
from gentletap.integrations.resend import sender as resend_sender
from gentletap.services.auth import hash_password
from gentletap.utils.redis_client import delete_key, get_json, set_json

RESET_TTL = 3600


def _token_key(token: str) -> str:
    return f"password_reset:{token}"


def request_password_reset(db: Session, email: str) -> None:
    """Create a reset token and email the user when Resend is configured."""
    user = db.query(Profile).filter(Profile.email == email.lower()).first()
    if user is None:
        return

    token = secrets.token_urlsafe(32)
    set_json(_token_key(token), {"user_id": str(user.id)}, ttl_seconds=RESET_TTL)

    settings = get_settings()
    if not resend_sender.is_configured() or not settings.auth_email_from.strip():
        return

    reset_url = f"{settings.web_url.rstrip('/')}/reset-password?token={token}"
    body = (
        f"Hi{((' ' + user.full_name.split()[0]) if user.full_name and user.full_name.strip() else '')},\n\n"
        f"We received a request to reset your GentleTap password.\n\n"
        f"Reset your password (link expires in 1 hour):\n{reset_url}\n\n"
        f"If you didn't request this, you can ignore this email.\n"
    )
    resend_sender.send_email(
        from_email=settings.auth_email_from,
        to=user.email,
        subject="Reset your GentleTap password",
        body=body,
    )


def reset_password(db: Session, *, token: str, new_password: str) -> None:
    stored = get_json(_token_key(token))
    if not stored:
        raise ValueError("This reset link is invalid or has expired")

    from uuid import UUID

    user = db.query(Profile).filter(Profile.id == UUID(stored["user_id"])).one_or_none()
    if user is None:
        raise ValueError("User not found")

    user.password_hash = hash_password(new_password)
    delete_key(_token_key(token))
    db.commit()

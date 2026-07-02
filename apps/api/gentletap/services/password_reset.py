"""Password reset tokens and email delivery."""

import secrets

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Profile
from gentletap.integrations.resend import sender as resend_sender
from gentletap.services.auth import hash_password, revoke_all_user_tokens
from gentletap.services.email_templates import AuthEmailData, render_password_reset_bodies
from gentletap.services.platform_email import send_platform_email
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
    first_name = user.full_name.split()[0] if user.full_name and user.full_name.strip() else ""
    greeting = f"Hi {first_name}," if first_name else "Hi,"
    plain, html = render_password_reset_bodies(
        AuthEmailData(
            greeting=greeting,
            message="We received a request to reset your GentleTap password. This link expires in 1 hour.",
            cta_label="Reset password",
            cta_url=reset_url,
        )
    )
    send_platform_email(
        to=user.email,
        subject="Reset your GentleTap password",
        plain=plain,
        html=html,
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
    # A reset means the account may be compromised — invalidate all sessions.
    revoke_all_user_tokens(db, user.id)

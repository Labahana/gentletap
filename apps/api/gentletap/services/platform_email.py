"""Platform emails sent from GentleTap (auth, payment alerts)."""

from gentletap.config import get_settings
from gentletap.integrations.resend import sender as resend_sender


def send_platform_email(*, to: str, subject: str, plain: str, html: str) -> bool:
    settings = get_settings()
    if not resend_sender.is_configured() or not settings.auth_email_from.strip():
        return False
    resend_sender.send_email(
        from_email=settings.auth_email_from,
        to=to,
        subject=subject,
        body=plain,
        html=html,
    )
    return True

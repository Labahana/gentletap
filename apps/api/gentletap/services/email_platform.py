"""Platform shared email sender for onboarding."""

from gentletap.config import Settings, get_settings
from gentletap.database import Profile
from gentletap.integrations.resend.sender import is_configured


def platform_available(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    return bool(is_configured() and cfg.platform_email_address.strip())


def sender_display_name(user: Profile) -> str:
    if user.company_name and user.company_name.strip():
        return f"{user.company_name.strip()} Accounts"
    if user.email_display_name and user.email_display_name.strip():
        return user.email_display_name.strip()
    if user.full_name and user.full_name.strip():
        return user.full_name.strip()
    return "Accounts"


def platform_from_address(user: Profile, settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    name = sender_display_name(user)
    address = cfg.platform_email_address.strip()
    return f"{name} <{address}>"


def domain_from_preview(user: Profile, domain: str) -> str:
    local = "accounts"
    name = sender_display_name(user)
    return f"{name} <{local}@{domain}>"

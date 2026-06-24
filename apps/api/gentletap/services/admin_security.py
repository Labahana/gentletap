"""Admin access control and audit logging."""

import uuid
from uuid import UUID

from fastapi import HTTPException, Request, status
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import AdminAuditLog, Profile


def admin_emails_configured() -> list[str]:
    return [e.lower() for e in get_settings().admin_emails if e.strip()]


def is_admin_email(email: str) -> bool:
    allowed = admin_emails_configured()
    return bool(allowed) and email.lower() in allowed


def client_ip(request: Request) -> str:
    forwarded = (request.headers.get("X-Forwarded-For") or "").split(",")[0].strip()
    if forwarded:
        return forwarded
    if request.client and request.client.host:
        return request.client.host
    return ""


def assert_admin_access(request: Request, user: Profile) -> None:
    """Fail closed with 404 — do not reveal that admin routes exist."""
    if not is_admin_email(user.email):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    allowlist = get_settings().admin_ip_allowlist
    if allowlist:
        ip = client_ip(request).lower()
        if ip not in allowlist:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")


def record_admin_action(
    db: Session,
    *,
    admin: Profile,
    action: str,
    request: Request,
    target_user_id: UUID | None = None,
    metadata: dict | None = None,
) -> None:
    db.add(
        AdminAuditLog(
            id=uuid.uuid4(),
            admin_user_id=admin.id,
            action=action,
            target_user_id=target_user_id,
            metadata_json=metadata,
            ip_address=client_ip(request) or None,
        )
    )
    db.commit()

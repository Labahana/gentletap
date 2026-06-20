"""WhatsApp connection helpers — shared platform number only."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Profile, WhatsappConnection
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.integrations.twilio.shared_sender import platform_webhook_config


def connection_status(db: Session, user: Profile) -> dict:
    conn = (
        db.query(WhatsappConnection)
        .filter(WhatsappConnection.user_id == user.id, WhatsappConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    settings = get_settings()
    platform_ready = wa_templates.templates_configured()
    shared_available = platform_ready and wa_templates.platform_sender_configured()
    webhooks = platform_webhook_config(settings)
    return {
        "connected": conn is not None and conn.status == "active",
        "mode": conn.mode if conn else None,
        "status": conn.status if conn else None,
        "platform_configured": platform_ready,
        "shared_available": shared_available,
        "shared_sender": webhooks.get("from_number"),
    }


def resolve_twilio_credentials(db: Session, user_id: UUID) -> tuple[str, str, str | None]:
    """Return (account_sid, auth_token, from_address) for sending."""
    settings = get_settings()
    from_addr = resolve_whatsapp_from(db, user_id)
    return settings.twilio_account_sid, settings.twilio_auth_token, from_addr


def connect_shared(db: Session, user: Profile) -> WhatsappConnection:
    if not wa_templates.platform_sender_configured() or not wa_templates.templates_configured():
        raise ValueError("Shared WhatsApp number is not configured on the platform")

    conn = (
        db.query(WhatsappConnection)
        .filter(WhatsappConnection.user_id == user.id, WhatsappConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    now = datetime.now(UTC)
    if conn:
        conn.mode = "shared"
        conn.phone_e164 = None
        conn.sender_sid = None
        conn.status = "active"
        conn.connected_at = now
        return conn

    conn = WhatsappConnection(
        user_id=user.id,
        mode="shared",
        status="active",
        connected_at=now,
    )
    db.add(conn)
    return conn


def disconnect(db: Session, user_id: UUID) -> None:
    conn = (
        db.query(WhatsappConnection)
        .filter(WhatsappConnection.user_id == user_id, WhatsappConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    if conn:
        conn.disconnected_at = datetime.now(UTC)
        conn.status = "disconnected"


def resolve_whatsapp_from(db: Session, user_id: UUID) -> str | None:
    settings = get_settings()
    conn = (
        db.query(WhatsappConnection)
        .filter(
            WhatsappConnection.user_id == user_id,
            WhatsappConnection.disconnected_at.is_(None),
            WhatsappConnection.status == "active",
            WhatsappConnection.mode == "shared",
        )
        .one_or_none()
    )
    if conn is None:
        return None
    return settings.twilio_whatsapp_from or None

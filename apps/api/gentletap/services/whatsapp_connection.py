"""WhatsApp connection helpers."""

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Profile, WhatsappConnection
from gentletap.integrations.twilio import templates as wa_templates
from gentletap.integrations.meta.validation import validate_embedded_signup
from gentletap.integrations.twilio.embedded_signup import embedded_signup_public_config, start_own_sender_registration
from gentletap.utils.crypto import decrypt_token


def connection_status(db: Session, user: Profile) -> dict:
    conn = (
        db.query(WhatsappConnection)
        .filter(WhatsappConnection.user_id == user.id, WhatsappConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    settings = get_settings()
    platform_ready = wa_templates.templates_configured()
    shared_available = platform_ready and wa_templates.platform_sender_configured()
    return {
        "connected": conn is not None and conn.status == "active",
        "mode": conn.mode if conn else None,
        "phone": conn.phone_e164 if conn else None,
        "status": conn.status if conn else None,
        "platform_configured": platform_ready,
        "shared_available": shared_available,
        "embedded_signup": embedded_signup_public_config(settings),
    }


def resolve_twilio_credentials(db: Session, user_id: UUID) -> tuple[str, str, str | None]:
    """Return (account_sid, auth_token, from_address) for sending."""
    settings = get_settings()
    conn = (
        db.query(WhatsappConnection)
        .filter(
            WhatsappConnection.user_id == user_id,
            WhatsappConnection.disconnected_at.is_(None),
            WhatsappConnection.status == "active",
        )
        .one_or_none()
    )
    from_addr = resolve_whatsapp_from(db, user_id)
    if conn and conn.mode == "own" and conn.twilio_subaccount_sid and conn.twilio_subaccount_token_enc:
        return (
            conn.twilio_subaccount_sid,
            decrypt_token(conn.twilio_subaccount_token_enc),
            from_addr,
        )
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


def connect_own(
    db: Session,
    user: Profile,
    *,
    phone_e164: str,
    waba_id: str | None = None,
    meta_code: str | None = None,
    meta_phone_number_id: str | None = None,
) -> WhatsappConnection:
    phone = phone_e164.strip()
    if not phone.startswith("+"):
        raise ValueError("Phone must be in E.164 format (e.g. +15551234567)")

    if waba_id and waba_id.strip():
        settings = get_settings()
        if settings.meta_app_secret or settings.is_production:
            validate_embedded_signup(
                code=meta_code,
                waba_id=waba_id.strip(),
                phone_e164=phone,
                meta_phone_number_id=meta_phone_number_id,
                settings=settings,
            )
        return start_own_sender_registration(
            db,
            user,
            phone_e164=phone,
            waba_id=waba_id.strip(),
            meta_phone_number_id=meta_phone_number_id,
        )

    conn = (
        db.query(WhatsappConnection)
        .filter(WhatsappConnection.user_id == user.id, WhatsappConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    now = datetime.now(UTC)
    if conn:
        conn.mode = "own"
        conn.phone_e164 = phone
        conn.status = "pending"
        conn.connected_at = now
        return conn

    conn = WhatsappConnection(
        user_id=user.id,
        mode="own",
        phone_e164=phone,
        status="pending",
        connected_at=now,
    )
    db.add(conn)
    return conn


def activate_own_connection(db: Session, user_id: UUID, *, sender_sid: str | None = None) -> None:
    conn = (
        db.query(WhatsappConnection)
        .filter(WhatsappConnection.user_id == user_id, WhatsappConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    if conn and conn.mode == "own":
        conn.status = "active"
        if sender_sid:
            conn.sender_sid = sender_sid


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
        )
        .one_or_none()
    )
    if conn is None:
        return None
    if conn.mode == "shared":
        return settings.twilio_whatsapp_from or None
    if conn.mode == "own" and conn.phone_e164:
        phone = conn.phone_e164
        return phone if phone.startswith("whatsapp:") else f"whatsapp:{phone}"
    return None

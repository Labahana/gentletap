"""Resolve which freelancer owns an inbound WhatsApp destination number."""

from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import WhatsappConnection
from gentletap.integrations.twilio.phone import normalize_phone_e164, phones_match


def resolve_user_id_for_to_phone(db: Session, to_phone: str) -> UUID | None:
    """Map Twilio To number to a user (own-number connection or shared platform number)."""
    normalized_to = normalize_phone_e164(to_phone.replace("whatsapp:", ""))
    if not normalized_to:
        return None

    own_connections = (
        db.query(WhatsappConnection)
        .filter(
            WhatsappConnection.disconnected_at.is_(None),
            WhatsappConnection.phone_e164.isnot(None),
            WhatsappConnection.status.in_(("active", "registering")),
        )
        .all()
    )
    for conn in own_connections:
        if conn.phone_e164 and phones_match(conn.phone_e164, normalized_to):
            return conn.user_id

    return None


def routed_via_for_to_phone(db: Session, to_phone: str) -> str:
    settings = get_settings()
    normalized_to = normalize_phone_e164(to_phone.replace("whatsapp:", ""))
    if not normalized_to:
        return "unknown"

    own_connections = (
        db.query(WhatsappConnection)
        .filter(
            WhatsappConnection.disconnected_at.is_(None),
            WhatsappConnection.phone_e164.isnot(None),
        )
        .all()
    )
    for conn in own_connections:
        if conn.phone_e164 and phones_match(conn.phone_e164, normalized_to):
            return "own_number"

    platform_from = settings.twilio_whatsapp_from or ""
    if platform_from and phones_match(platform_from, normalized_to):
        return "shared_number"
    return "unknown"

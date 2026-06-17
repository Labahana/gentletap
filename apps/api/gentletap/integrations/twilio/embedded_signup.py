"""Twilio ISV Embedded Signup — subaccounts and Senders API."""

from __future__ import annotations

import time
from uuid import UUID

import httpx
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import Profile, WhatsappConnection
from gentletap.integrations.meta.validation import validate_embedded_signup
from gentletap.integrations.twilio.phone import normalize_phone_e164, whatsapp_sender_id
from gentletap.utils.crypto import decrypt_token, encrypt_token

SENDERS_API = "https://messaging.twilio.com/v2/Channels/Senders"
ACCOUNTS_API = "https://api.twilio.com/2010-04-01/Accounts.json"


def is_embedded_signup_configured(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    return bool(
        cfg.meta_app_id
        and cfg.meta_embedded_signup_config_id
        and cfg.meta_partner_solution_id
        and cfg.twilio_account_sid
        and cfg.twilio_auth_token
    )


def embedded_signup_public_config(settings: Settings | None = None) -> dict:
    cfg = settings or get_settings()
    return {
        "configured": is_embedded_signup_configured(cfg),
        "app_id": cfg.meta_app_id or None,
        "config_id": cfg.meta_embedded_signup_config_id or None,
        "solution_id": cfg.meta_partner_solution_id or None,
        "sdk_version": "v21.0",
        "feature_type": "only_waba_sharing",
        "requires_meta_validation": bool(cfg.meta_app_secret),
    }


def _inbound_webhook_url(settings: Settings) -> str:
    return f"{settings.api_url.rstrip('/')}/v1/webhooks/twilio/whatsapp"


def _parent_auth(settings: Settings) -> tuple[str, str]:
    return settings.twilio_account_sid, settings.twilio_auth_token


def ensure_subaccount(db: Session, user: Profile, conn: WhatsappConnection) -> WhatsappConnection:
    settings = get_settings()
    if conn.twilio_subaccount_sid and conn.twilio_subaccount_token_enc:
        return conn
    if not settings.twilio_use_subaccounts:
        return conn

    friendly = (user.full_name or user.email.split("@")[0])[:60]
    with httpx.Client(timeout=30.0) as client:
        response = client.post(
            ACCOUNTS_API,
            auth=_parent_auth(settings),
            data={"FriendlyName": f"GentleTap — {friendly}"},
        )
        response.raise_for_status()
        data = response.json()

    conn.twilio_subaccount_sid = data["sid"]
    conn.twilio_subaccount_token_enc = encrypt_token(data["auth_token"])
    return conn


def _sender_auth(conn: WhatsappConnection, settings: Settings) -> tuple[str, str]:
    if conn.twilio_subaccount_sid and conn.twilio_subaccount_token_enc:
        return conn.twilio_subaccount_sid, decrypt_token(conn.twilio_subaccount_token_enc)
    return _parent_auth(settings)


def register_whatsapp_sender(
    conn: WhatsappConnection,
    *,
    waba_id: str,
    phone_e164: str,
    display_name: str | None = None,
) -> str:
    settings = get_settings()
    phone = normalize_phone_e164(phone_e164)
    if not phone:
        raise ValueError("Invalid phone number")

    payload: dict = {
        "sender_id": whatsapp_sender_id(phone),
        "configuration": {"waba_id": waba_id},
        "webhook": {
            "callback_method": "POST",
            "callback_url": _inbound_webhook_url(settings),
            "fallback_method": "POST",
            "fallback_url": _inbound_webhook_url(settings),
            "status_callback_method": "POST",
            "status_callback_url": f"{settings.api_url.rstrip('/')}/v1/webhooks/twilio/whatsapp/status",
        },
    }
    if display_name:
        payload["profile"] = {"name": display_name[:100]}

    account_sid, auth_token = _sender_auth(conn, settings)
    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            SENDERS_API,
            auth=(account_sid, auth_token),
            json=payload,
        )
        response.raise_for_status()
        data = response.json()

    return data.get("sid", "")


def fetch_sender_status(sender_sid: str, conn: WhatsappConnection) -> str:
    settings = get_settings()
    account_sid, auth_token = _sender_auth(conn, settings)
    url = f"{SENDERS_API}/{sender_sid}"
    with httpx.Client(timeout=30.0) as client:
        response = client.get(url, auth=(account_sid, auth_token))
        response.raise_for_status()
        return (response.json().get("status") or "").upper()


def wait_for_sender_online(sender_sid: str, conn: WhatsappConnection, *, attempts: int = 6) -> str:
    status = "OFFLINE"
    for _ in range(attempts):
        status = fetch_sender_status(sender_sid, conn)
        if status == "ONLINE":
            return status
        time.sleep(5)
    return status


def start_own_sender_registration(
    db: Session,
    user: Profile,
    *,
    phone_e164: str,
    waba_id: str,
    meta_phone_number_id: str | None = None,
) -> WhatsappConnection:
    """Register an own-number WhatsApp sender with Twilio (shared by embedded signup and manual connect)."""
    settings = get_settings()
    phone = normalize_phone_e164(phone_e164)
    if not phone:
        raise ValueError("Phone must be in E.164 format")
    if not waba_id.strip():
        raise ValueError("WABA ID is required for sender registration")

    conn = (
        db.query(WhatsappConnection)
        .filter(WhatsappConnection.user_id == user.id, WhatsappConnection.disconnected_at.is_(None))
        .one_or_none()
    )
    from datetime import UTC, datetime

    now = datetime.now(UTC)
    if conn is None:
        conn = WhatsappConnection(user_id=user.id, mode="own", connected_at=now)
        db.add(conn)

    conn.mode = "own"
    conn.phone_e164 = phone
    conn.waba_id = waba_id
    conn.meta_phone_number_id = meta_phone_number_id
    conn.status = "registering"
    conn.connected_at = now

    if settings.twilio_use_subaccounts:
        ensure_subaccount(db, user, conn)

    display_name = user.full_name or user.email.split("@")[0]
    sender_sid = register_whatsapp_sender(conn, waba_id=waba_id, phone_e164=phone, display_name=display_name)
    conn.sender_sid = sender_sid
    return conn


def complete_embedded_signup(
    db: Session,
    user: Profile,
    *,
    waba_id: str,
    phone_e164: str,
    meta_phone_number_id: str | None = None,
    meta_code: str | None = None,
) -> WhatsappConnection:
    settings = get_settings()
    if not is_embedded_signup_configured(settings):
        raise ValueError("Meta Embedded Signup is not configured")

    validate_embedded_signup(
        code=meta_code,
        waba_id=waba_id,
        phone_e164=phone_e164,
        meta_phone_number_id=meta_phone_number_id,
        settings=settings,
    )

    return start_own_sender_registration(
        db,
        user,
        phone_e164=phone_e164,
        waba_id=waba_id,
        meta_phone_number_id=meta_phone_number_id,
    )


def activate_connection_if_online(db: Session, conn_id: UUID) -> bool:
    conn = db.query(WhatsappConnection).filter(WhatsappConnection.id == conn_id).one_or_none()
    if conn is None or not conn.sender_sid or conn.status == "active":
        return conn is not None and conn.status == "active"

    status = fetch_sender_status(conn.sender_sid, conn)
    if status == "ONLINE":
        conn.status = "active"
        return True
    return False

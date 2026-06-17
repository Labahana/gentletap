"""Paddle webhook signature verification and event handling."""

from __future__ import annotations

import hashlib
import hmac
import time
from typing import Any

from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import BillingWebhookEvent, Profile
from gentletap.integrations.paddle import billing as paddle_billing


def verify_signature(payload: bytes, signature_header: str | None, *, tolerance_seconds: int = 300) -> bool:
    secret = get_settings().paddle_webhook_secret
    if not secret or not signature_header:
        return False

    parts: dict[str, str] = {}
    for piece in signature_header.split(";"):
        if "=" in piece:
            key, value = piece.split("=", 1)
            parts[key.strip()] = value.strip()

    ts = parts.get("ts")
    h1_values = [v for k, v in parts.items() if k == "h1"]
    if not ts or not h1_values:
        return False

    try:
        if abs(int(time.time()) - int(ts)) > tolerance_seconds:
            return False
    except ValueError:
        return False

    signed = f"{ts}:{payload.decode('utf-8')}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), signed, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, sig) for sig in h1_values)


def _claim_event(db: Session, event_id: str) -> bool:
    """Return True if this event should be processed (first time seen)."""
    if not event_id:
        return True
    if (
        db.query(BillingWebhookEvent)
        .filter(BillingWebhookEvent.event_id == event_id)
        .one_or_none()
    ):
        return False
    db.add(BillingWebhookEvent(event_id=event_id))
    db.flush()
    return True


def _custom_data(obj: dict) -> dict[str, Any]:
    raw = obj.get("custom_data") or {}
    return raw if isinstance(raw, dict) else {}


def _user_from_customer(db: Session, customer_id: str | None) -> Profile | None:
    if not customer_id:
        return None
    return db.query(Profile).filter(Profile.paddle_customer_id == customer_id).one_or_none()


def _user_from_custom_data(db: Session, custom: dict) -> Profile | None:
    from uuid import UUID

    user_id = custom.get("user_id")
    if not user_id:
        return None
    try:
        return db.query(Profile).filter(Profile.id == UUID(str(user_id))).one_or_none()
    except (ValueError, TypeError):
        return None


def _plan_for_subscription(sub: dict, settings: Settings) -> str:
    status = (sub.get("status") or "").lower()
    if status in ("active", "trialing", "past_due"):
        return paddle_billing.resolve_plan_from_subscription(sub, settings)
    if status == "canceled":
        scheduled = sub.get("scheduled_change") or {}
        if scheduled.get("action") == "cancel" and scheduled.get("effective_at"):
            return paddle_billing.resolve_plan_from_subscription(sub, settings)
        return "free"
    if status in ("paused",):
        return "free"
    return "free"


def handle_webhook_event(db: Session, payload: dict, settings: Settings | None = None) -> None:
    settings = settings or get_settings()
    event_id = payload.get("event_id") or payload.get("notification_id") or ""
    event_type = payload.get("event_type", "")
    data = payload.get("data") or {}

    if event_id and not _claim_event(db, event_id):
        return

    if event_type in ("subscription.created", "subscription.updated", "subscription.activated"):
        sub = data
        customer_id = sub.get("customer_id")
        user = _user_from_customer(db, customer_id) or _user_from_custom_data(db, _custom_data(sub))
        if user:
            plan = _plan_for_subscription(sub, settings)
            paddle_billing.apply_subscription_update(
                db,
                str(user.id),
                plan,
                subscription_id=sub.get("id"),
            )
            if customer_id and not user.paddle_customer_id:
                user.paddle_customer_id = customer_id
        db.commit()

    elif event_type in ("subscription.canceled", "subscription.paused"):
        sub = data
        user = _user_from_customer(db, sub.get("customer_id"))
        if user:
            paddle_billing.apply_subscription_update(db, str(user.id), "free")
        db.commit()

    elif event_type == "transaction.completed":
        custom = _custom_data(data)
        if custom.get("type") == "whatsapp_credits":
            user = _user_from_custom_data(db, custom) or _user_from_customer(db, data.get("customer_id"))
            credits = int(custom.get("credits", 0) or 0)
            if user and credits > 0:
                paddle_billing.apply_whatsapp_credits(db, str(user.id), credits)
        elif custom.get("type") == "subscription" and custom.get("user_id"):
            plan = custom.get("plan") or "pro"
            paddle_billing.apply_subscription_update(db, str(custom["user_id"]), str(plan))
            db.commit()

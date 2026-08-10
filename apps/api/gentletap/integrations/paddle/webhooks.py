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
from gentletap.services import affiliates as affiliate_service
from gentletap.services import payment_notifications


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


def _occurred_at(payload: dict):
    """Parse Paddle's RFC3339 occurred_at for out-of-order event detection."""
    from datetime import datetime

    raw = payload.get("occurred_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None


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
        occurred = _occurred_at(payload)
        customer_id = sub.get("customer_id")
        user = _user_from_customer(db, customer_id) or _user_from_custom_data(db, _custom_data(sub))
        if user:
            plan = _plan_for_subscription(sub, settings)
            paddle_billing.apply_subscription_update(
                db,
                str(user.id),
                plan,
                subscription_id=sub.get("id"),
                occurred_at=occurred,
            )
            if customer_id and not user.paddle_customer_id:
                user.paddle_customer_id = customer_id
        db.commit()

    elif event_type == "transaction.completed":
        custom = _custom_data(data)
        items = data.get("items") or []
        if custom.get("type") == "whatsapp_credits":
            user = _user_from_custom_data(db, custom) or _user_from_customer(db, data.get("customer_id"))
            # Entitlements derive from the purchased price IDs — custom_data is
            # attacker-controllable via the publishable Paddle.js client token.
            credits = paddle_billing.whatsapp_credits_from_items(items, settings)
            if user and credits > 0:
                paddle_billing.apply_whatsapp_credits(db, str(user.id), credits)
        elif custom.get("type") == "subscription" and custom.get("user_id"):
            plan = paddle_billing.resolve_plan_from_items(items, settings)
            if plan != "free":
                paddle_billing.apply_subscription_update(
                    db,
                    str(custom["user_id"]),
                    plan,
                    subscription_id=data.get("subscription_id"),
                )
            user = _user_from_custom_data(db, custom) or _user_from_customer(db, data.get("customer_id"))
            if user:
                txn_id = data.get("id") or payload.get("event_id") or ""
                gross, currency = affiliate_service.paddle_transaction_gross(data)
                if txn_id and gross > 0:
                    referral = affiliate_service.referral_for_user(db, user.id)
                    event_kind = "initial" if referral and not referral.first_paid_at else "renewal"
                    affiliate_service.record_subscription_commission(
                        db,
                        user=user,
                        paddle_transaction_id=str(txn_id),
                        paddle_subscription_id=data.get("subscription_id"),
                        gross_amount=gross,
                        currency=currency,
                        event_type=event_kind,
                    )
            db.commit()

    elif event_type in ("transaction.payment_failed",):
        custom = _custom_data(data)
        user = _user_from_custom_data(db, custom) or _user_from_customer(db, data.get("customer_id"))
        if user:
            gross, currency = affiliate_service.paddle_transaction_gross(data)
            payment_notifications.send_dunning_email(
                db, user, amount=float(gross), currency=currency
            )
        db.commit()

    elif event_type in ("adjustment.created", "adjustment.updated"):
        adjustment = data
        action = (adjustment.get("action") or "").lower()
        txn_id = adjustment.get("transaction_id") or (adjustment.get("transaction") or {}).get("id")
        if action in ("refund", "chargeback", "credit") and txn_id:
            affiliate_service.clawback_commission(db, str(txn_id))
            db.commit()

    elif event_type in ("subscription.canceled", "subscription.paused"):
        sub = data
        occurred = _occurred_at(payload)
        user = _user_from_customer(db, sub.get("customer_id"))
        if user:
            affiliate_service.mark_referral_churned(db, user.id)
            paddle_billing.apply_subscription_update(
                db, str(user.id), "free", occurred_at=occurred
            )
        db.commit()

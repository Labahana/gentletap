"""Notification preferences (event × channel matrix), shared by API and services."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import NotificationPreference

EVENTS = [
    "payment_received",
    "payment_failed",
    "client_replied",
    "whatsapp_failed",
    "escalation",
    "sync_error",
    "quota_low",
    "sends_digest",
]
CHANNELS = ["in_app", "email"]

DEFAULT_PREFS = {event: {"in_app": True, "email": event in {"payment_received", "payment_failed"}} for event in EVENTS}
DEFAULT_PREFS["sends_digest"] = {"in_app": False, "email": False}


def defaults() -> dict:
    return {event: dict(channels) for event, channels in DEFAULT_PREFS.items()}


def merge_prefs(stored: dict | None) -> dict:
    merged = defaults()
    if isinstance(stored, dict):
        for event, channels in stored.items():
            if event not in merged or not isinstance(channels, dict):
                continue
            for ch in CHANNELS:
                if ch in channels:
                    merged[event][ch] = bool(channels[ch])
    return merged


def prefs_for(db: Session, user_id: UUID) -> dict:
    row = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).one_or_none()
    return merge_prefs(row.prefs if row else None)


def channel_enabled(db: Session, user_id: UUID, event: str, channel: str) -> bool:
    if event not in DEFAULT_PREFS or channel not in CHANNELS:
        return True
    return bool(prefs_for(db, user_id).get(event, {}).get(channel, True))

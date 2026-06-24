"""Redis-backed cache for expensive dashboard aggregates."""

from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.utils.redis_client import delete_key, get_json, set_json

SUMMARY_TTL_SECONDS = 60


def summary_cache_key(user_id: UUID) -> str:
    return f"dashboard_summary:{user_id}"


def invalidate_dashboard_summary(user_id: UUID) -> None:
    delete_key(summary_cache_key(user_id))


def get_invoices_summary_cached(db: Session, user_id: UUID) -> dict:
    cached = get_json(summary_cache_key(user_id))
    if cached is not None:
        return cached
    from gentletap.services.dashboard_data import build_invoices_summary

    payload = build_invoices_summary(db, user_id)
    set_json(summary_cache_key(user_id), payload, ttl_seconds=SUMMARY_TTL_SECONDS)
    return payload

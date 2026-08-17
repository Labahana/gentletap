"""Redis helpers for idempotent Celery task locks."""

from __future__ import annotations

import logging
from contextlib import contextmanager
from typing import Iterator, Optional

import redis

from app.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(settings.redis_url, decode_responses=True)
    return _client


@contextmanager
def redis_lock(key: str, ttl_seconds: int = 300) -> Iterator[bool]:
    """
    Acquire a Redis lock. Yields True if acquired, False otherwise.
    Always releases if we acquired it.
    """
    client = get_redis()
    token = "1"
    acquired = False
    try:
        acquired = bool(client.set(key, token, nx=True, ex=ttl_seconds))
        yield acquired
    except redis.RedisError as exc:
        logger.warning("Redis lock error for %s: %s — proceeding without lock", key, exc)
        yield True  # fail-open for local/dev without redis in unit tests
    finally:
        if acquired:
            try:
                client.delete(key)
            except redis.RedisError:
                pass


def is_suppressed_cached(org_id: str, address: str) -> Optional[bool]:
    """Optional cache peek; returns None if cache miss / error."""
    try:
        val = get_redis().get(f"suppress:{org_id}:{address.lower()}")
        if val is None:
            return None
        return val == "1"
    except redis.RedisError:
        return None


def cache_suppression(org_id: str, address: str, ttl: int = 86400) -> None:
    try:
        get_redis().setex(f"suppress:{org_id}:{address.lower()}", ttl, "1")
    except redis.RedisError:
        pass

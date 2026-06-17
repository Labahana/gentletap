import json
from functools import lru_cache
from typing import Any

import redis

from gentletap.config import get_settings


@lru_cache
def get_redis() -> redis.Redis:
    return redis.from_url(get_settings().redis_url, decode_responses=True)


def set_json(key: str, value: dict[str, Any], ttl_seconds: int | None = None) -> None:
    client = get_redis()
    payload = json.dumps(value)
    if ttl_seconds:
        client.setex(key, ttl_seconds, payload)
    else:
        client.set(key, payload)


def delete_key(key: str) -> None:
    get_redis().delete(key)


def get_json(key: str) -> dict[str, Any] | None:
    raw = get_redis().get(key)
    if not raw:
        return None
    return json.loads(raw)

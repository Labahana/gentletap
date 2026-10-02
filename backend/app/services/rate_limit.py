"""Lightweight Redis-backed rate limiting for sensitive endpoints.

Usage:
    from app.services.rate_limit import rate_limit

    @router.post("/login", dependencies=[Depends(rate_limit("10/60"))])
    def login(...): ...

Keyed by client IP + route tag. Fails OPEN when Redis is unavailable
(availability preferred over strictness; logged loudly). No new dependencies —
uses the existing redis client.
"""

from __future__ import annotations

import logging
from typing import Optional

from fastapi import HTTPException, Request, status

from app.services.redis_lock import get_redis

logger = logging.getLogger(__name__)


def allow(bucket_key: str, max_requests: int, window_seconds: int) -> bool:
    """Fixed-window counter for non-HTTP callers (e.g. outbound send throttles).

    Returns True when the call is within budget. Fails OPEN (True) when Redis
    is unavailable so a cache blip never blocks legitimate sends.
    """
    key = f"rl:out:{bucket_key}:{window_seconds}"
    try:
        r = get_redis()
        current = r.incr(key)
        if current == 1:
            r.expire(key, window_seconds)
        return current <= max_requests
    except Exception as exc:  # noqa: BLE001 - fail open
        logger.warning("Outbound rate limiter unavailable (%s); allowing send", exc)
        return True


def client_ip(request: Request) -> str:
    # Behind nginx/Caddy, X-Forwarded-For carries the real client. Only trust it
    # when the deployment is actually behind a trusted proxy — otherwise an
    # attacker can rotate a spoofed XFF to evade IP-keyed rate limits.
    from app.config import get_settings

    if get_settings().trust_proxy_headers:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
        real = request.headers.get("x-real-ip")
        if real:
            return real.strip()
    return request.client.host if request.client else "unknown"


def rate_limit(limit: str, *, key_extra: str = "", fail_closed: bool = False):
    """Build a dependency enforcing e.g. rate_limit("5/60") = 5 requests / 60s.

    fail_closed=True makes a Redis outage return 503 instead of allowing the
    request — use for unauthenticated, cost-bearing endpoints (e.g. public chat)
    where an unlimited fallback is worse than a brief outage.
    """
    count_part, _, window_part = limit.partition("/")
    max_requests = int(count_part)
    window_seconds = int(window_part) if window_part else 60

    def _dependency(request: Request):
        ip = client_ip(request)
        route_tag = getattr(request.scope.get("route"), "path", request.url.path)
        cache_key = f"rl:{route_tag}:{key_extra}:{ip}:{window_seconds}"
        try:
            r = get_redis()
            current = r.incr(cache_key)
            if current == 1:
                r.expire(cache_key, window_seconds)
            ttl = r.ttl(cache_key)
        except Exception as exc:  # noqa: BLE001
            if fail_closed:
                logger.error("Rate limiter unavailable (%s); rejecting (fail closed)", exc)
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Service temporarily unavailable. Please try again shortly.",
                )
            logger.warning("Rate limiter unavailable (%s); allowing request", exc)
            return

        if current > max_requests:
            retry_after = ttl if ttl and ttl > 0 else window_seconds
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please slow down.",
                headers={"Retry-After": str(retry_after)},
            )

    return _dependency

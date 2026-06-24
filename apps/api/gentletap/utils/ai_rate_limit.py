"""Global AI outbound rate limiter (Redis token bucket)."""

import logging

from gentletap.config import get_settings
from gentletap.utils.redis_client import get_redis

logger = logging.getLogger(__name__)


def acquire_ai_slot(*, scope: str = "global") -> bool:
    """Return True if an AI API call is allowed under the per-minute cap."""
    settings = get_settings()
    limit = settings.ai_rate_limit_per_minute
    if limit <= 0:
        return True
    try:
        client = get_redis()
        key = f"ai_rate:{scope}"
        count = client.incr(key)
        if count == 1:
            client.expire(key, 60)
        return int(count) <= limit
    except Exception:
        logger.warning("AI rate limiter unavailable — allowing call")
        return True

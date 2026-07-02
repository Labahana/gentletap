from slowapi import Limiter

from gentletap.config import get_settings
from gentletap.utils.request_ip import client_ip


def _build_limiter() -> Limiter:
    settings = get_settings()
    kwargs: dict = {
        # Key by the trusted client IP (not the spoofable first X-Forwarded-For).
        "key_func": client_ip,
        "default_limits": ["120/minute"],
    }
    redis_url = settings.redis_url.strip()
    if redis_url:
        try:
            return Limiter(storage_uri=redis_url, **kwargs)
        except Exception:
            pass
    return Limiter(**kwargs)


limiter = _build_limiter()

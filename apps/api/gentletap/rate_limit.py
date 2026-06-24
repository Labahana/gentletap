from slowapi import Limiter
from slowapi.util import get_remote_address

from gentletap.config import get_settings


def _build_limiter() -> Limiter:
    settings = get_settings()
    kwargs: dict = {
        "key_func": get_remote_address,
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

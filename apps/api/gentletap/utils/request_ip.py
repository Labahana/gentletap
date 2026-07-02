"""Resolve the real client IP, respecting a trusted reverse proxy.

nginx sets ``X-Real-IP`` to the true TCP peer (overwriting any client-supplied
value) and appends the real peer to ``X-Forwarded-For``. The Next.js proxy then
forwards those headers unchanged to the API. When ``trust_proxy_headers`` is on
we read those trusted values; otherwise (or when they are absent, e.g. local
dev) we fall back to the socket peer.

Never trust the *first* ``X-Forwarded-For`` entry — it is fully client
controllable. The rightmost entry is the one appended by our own proxy chain.
"""

from starlette.requests import Request

from gentletap.config import get_settings


def client_ip(request: Request) -> str:
    settings = get_settings()
    if settings.trust_proxy_headers:
        real_ip = (request.headers.get("X-Real-IP") or "").strip()
        if real_ip:
            return real_ip
        forwarded = request.headers.get("X-Forwarded-For") or ""
        parts = [p.strip() for p in forwarded.split(",") if p.strip()]
        if parts:
            return parts[-1]
    if request.client and request.client.host:
        return request.client.host
    return ""

"""Shared outbound HTTP client — reuse connections across integration calls."""

from functools import lru_cache

import httpx


@lru_cache
def get_http_client() -> httpx.Client:
    return httpx.Client(
        timeout=60.0,
        limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
    )

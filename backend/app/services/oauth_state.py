"""Signed OAuth state tokens binding a provider connect to an org.

The SPA keeps its JWT in localStorage, so the provider's redirect back to our
callback carries no credentials. We instead sign the org identity (plus a short
expiry) into the ``state`` parameter when the frontend requests an auth URL,
and verify the signature in the callback. No server-side storage needed.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import secrets
import time
from typing import Any, Dict, Optional

from app.config import get_settings

STATE_TTL_SECONDS = 600


def _sign(payload: str) -> str:
    key = (get_settings().secret_key or "dev-only-insecure-key").encode()
    return hmac.new(key, payload.encode(), hashlib.sha256).hexdigest()


def create_state(org_id: str, provider: str, dest: str = "onboarding") -> str:
    body = json.dumps(
        {
            "org": org_id,
            "provider": provider,
            "dest": dest,
            "exp": int(time.time()) + STATE_TTL_SECONDS,
            "n": secrets.token_urlsafe(8),
        }
    )
    encoded = base64.urlsafe_b64encode(body.encode()).decode().rstrip("=")
    return f"{encoded}.{_sign(encoded)}"


def verify_state(state: str) -> Optional[Dict[str, Any]]:
    try:
        encoded, sig = state.rsplit(".", 1)
        if not hmac.compare_digest(_sign(encoded), sig):
            return None
        padded = encoded + "=" * (-len(encoded) % 4)
        data = json.loads(base64.urlsafe_b64decode(padded))
        if int(data.get("exp", 0)) < time.time():
            return None
        return data
    except Exception:
        return None

"""Validate Twilio webhook signatures."""

import base64
import hashlib
import hmac


def verify_twilio_signature(
    *,
    url: str,
    params: dict[str, str],
    signature: str | None,
    auth_token: str,
) -> bool:
    if not signature or not auth_token:
        return False
    pieces = url + "".join(params[k] for k in sorted(params))
    digest = hmac.new(auth_token.encode("utf-8"), pieces.encode("utf-8"), hashlib.sha1).digest()
    expected = base64.b64encode(digest).decode("utf-8")
    return hmac.compare_digest(expected, signature)

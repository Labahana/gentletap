"""Best-effort OAuth provider token revocation on disconnect / GDPR purge.

Blanking our local copy of a token stops *us* from using it, but does nothing
about a token that leaks from a DB backup or is replayed directly against the
provider. RFC 7009-style revocation asks the provider to invalidate the
long-lived refresh token too, so it can't mint new access tokens after the user
disconnects.

Every call here is strictly best-effort and never raises: a provider outage, a
missing credential, or an unrecognised response must not block the disconnect
UX or the GDPR purge sweep. The caller always destroys the local secrets
regardless of what the network call returned.
"""

from __future__ import annotations

import logging

import httpx

from app.config import get_settings
from app.models.connection import Connection
from app.services.crypto import decrypt_secret, is_mock

logger = logging.getLogger(__name__)
settings = get_settings()

# Production token-revocation endpoints for the three providers we connect to.
QBO_REVOKE_URL = "https://developer.api.intuit.com/v2/token/revoke"
FRESHBOOKS_REVOKE_URL = "https://api.freshbooks.com/auth/oauth/token/revoke"
GOOGLE_REVOKE_URL = "https://oauth2.googleapis.com/revoke"

_TIMEOUT_SECONDS = 10.0


def revoke_connection_token(conn: Connection) -> bool:
    """Ask the provider to invalidate this connection's token. Returns True on a
    confirmed revocation; False (never raises) when skipped or failed."""
    try:
        # Revoking the refresh token is what actually stops future access-token
        # minting; it is the long-lived credential.
        refresh = decrypt_secret(conn.refresh_token_encrypted)
        if not refresh or is_mock(refresh):
            return False

        if conn.provider == "quickbooks":
            if not (settings.intuit_client_id and settings.intuit_client_secret):
                return False
            with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
                res = client.post(
                    QBO_REVOKE_URL,
                    auth=(settings.intuit_client_id, settings.intuit_client_secret),
                    json={"token": refresh, "token_type_hint": "refresh_token"},
                )
            return res.status_code == 200

        if conn.provider == "freshbooks":
            if not (settings.freshbooks_client_id and settings.freshbooks_client_secret):
                return False
            with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
                res = client.post(
                    FRESHBOOKS_REVOKE_URL,
                    json={
                        "client_id": settings.freshbooks_client_id,
                        "client_secret": settings.freshbooks_client_secret,
                        "token": refresh,
                    },
                )
            return res.status_code in (200, 204)

        if conn.provider in ("google", "gmail"):
            # Google accepts an access OR refresh token via query param (RFC 7009).
            token = refresh or decrypt_secret(conn.token_encrypted)
            with httpx.Client(timeout=_TIMEOUT_SECONDS) as client:
                res = client.post(GOOGLE_REVOKE_URL, params={"token": token})
            return res.status_code == 200

        return False
    except Exception as exc:  # noqa: BLE001 - revocation is advisory, never fatal
        logger.warning(
            "Provider token revocation failed for %s connection %s: %s",
            conn.provider,
            conn.id,
            exc,
        )
        return False


def destroy_connection_secrets(conn: Connection) -> None:
    """Overwrite the stored token material and mark the row disconnected.

    Keeps the row (invoices reference it via a nullable FK) but erases every
    usable secret so neither a disconnect nor a GDPR purge can leave a live,
    decryptable token behind. Caller commits.
    """
    conn.token_encrypted = ""
    conn.refresh_token_encrypted = ""
    conn.token_expires_at = None
    conn.status = "disconnected"

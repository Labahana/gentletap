"""Server-side Meta Graph validation for WhatsApp Embedded Signup."""

from __future__ import annotations

import httpx

from gentletap.config import Settings, get_settings
from gentletap.integrations.twilio.phone import normalize_phone_e164, phones_match

GRAPH_API = "https://graph.facebook.com/v21.0"


def exchange_code_for_token(code: str, settings: Settings | None = None) -> str:
    cfg = settings or get_settings()
    if not cfg.meta_app_id or not cfg.meta_app_secret:
        raise ValueError("Meta app credentials are not configured")

    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{GRAPH_API}/oauth/access_token",
            params={
                "client_id": cfg.meta_app_id,
                "client_secret": cfg.meta_app_secret,
                "code": code,
            },
        )
        response.raise_for_status()
        data = response.json()

    token = data.get("access_token")
    if not token:
        raise ValueError("Meta did not return an access token")
    return str(token)


def _graph_get(path: str, access_token: str, *, params: dict | None = None) -> dict:
    with httpx.Client(timeout=30.0) as client:
        response = client.get(
            f"{GRAPH_API}/{path}",
            params={"access_token": access_token, **(params or {})},
        )
        if response.status_code == 404:
            raise ValueError("Meta resource not found or not accessible")
        response.raise_for_status()
        return response.json()


def validate_embedded_signup(
    *,
    code: str | None,
    waba_id: str,
    phone_e164: str,
    meta_phone_number_id: str | None = None,
    settings: Settings | None = None,
) -> None:
    """Verify WABA and phone ownership via Meta Graph API."""
    cfg = settings or get_settings()
    if not cfg.meta_app_secret:
        if cfg.is_production:
            raise ValueError("Meta app secret is required in production")
        return

    if not code:
        raise ValueError("Facebook authorization code is required")

    phone = normalize_phone_e164(phone_e164)
    if not phone:
        raise ValueError("Phone must be in E.164 format")

    access_token = exchange_code_for_token(code, cfg)

    waba = _graph_get(waba_id, access_token, params={"fields": "id"})
    if str(waba.get("id", "")) != str(waba_id):
        raise ValueError("WABA ID mismatch")

    if meta_phone_number_id:
        phone_data = _graph_get(
            meta_phone_number_id,
            access_token,
            params={"fields": "display_phone_number,verified_name"},
        )
        display = phone_data.get("display_phone_number") or ""
        if display and not phones_match(display, phone):
            raise ValueError("Phone number does not match Meta phone number ID")

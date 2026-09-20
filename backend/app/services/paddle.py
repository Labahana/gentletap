"""Paddle Billing v2 client + webhook signature verification."""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from typing import Any, Dict, Optional

import httpx

from app.config import get_settings
from app.services.plan_gating import PLAN_PRICES, apply_plan_quotas, normalize_plan

logger = logging.getLogger(__name__)
settings = get_settings()


def _paddle_configured() -> bool:
    """Check if Paddle API key is configured."""
    return bool(settings.paddle_api_key and settings.paddle_api_key.strip())


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.paddle_api_key}",
        "Content-Type": "application/json",
    }


def _request(method: str, path: str, *, json_body: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Make a Paddle API request. Raises ValueError on failures.
    Uses dynamic sandbox/production URL based on paddle_env setting.
    """
    if not _paddle_configured():
        raise ValueError("Paddle is not configured. Set PADDLE_API_KEY in the environment.")

    url = f"{settings.paddle_api_base}{path}"
    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.request(method, url, headers=_headers(), json=json_body)
            if response.status_code >= 400:
                detail = response.text[:500]
                logger.error("Paddle API error (%s): %s", response.status_code, detail)
                raise ValueError(f"Paddle API error ({response.status_code}): {detail}")
            return response.json().get("data", response.json())
    except httpx.RequestError as exc:
        logger.error("Paddle request failed: %s", exc)
        raise ValueError(f"Paddle request failed: {exc}") from exc


def price_id_for_plan(plan: str, annual: bool) -> str:
    plan = normalize_plan(plan)
    mapping = {
        ("pro", False): settings.paddle_price_id_pro_monthly or settings.paddle_price_id_pro,
        ("pro", True): settings.paddle_price_id_pro_annual or settings.paddle_price_id_pro,
        ("pro_plus", False): settings.paddle_price_id_pro_plus_monthly,
        ("pro_plus", True): settings.paddle_price_id_pro_plus_annual,
        ("team", False): settings.paddle_price_id_team_monthly,
        ("team", True): settings.paddle_price_id_team_annual,
    }
    price_id = mapping.get((plan, annual), settings.paddle_price_id_pro_monthly or settings.paddle_price_id_pro)
    if not price_id:
        raise ValueError(f"No Paddle price ID configured for plan={plan}, annual={annual}")
    return price_id


def verify_paddle_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """
    Verify Paddle Billing webhook signature.
    Header format: ts=...;h1=...
    FAIL-CLOSED: an empty PADDLE_WEBHOOK_SECRET rejects every webhook.
    """
    secret = settings.paddle_webhook_secret
    if not secret:
        logger.error(
            "PADDLE_WEBHOOK_SECRET not set — rejecting webhook. "
            "Set it in the environment (see .env.example)."
        )
        return False
    if not signature_header:
        return False

    parts = dict(p.split("=", 1) for p in signature_header.split(";") if "=" in p)
    ts = parts.get("ts")
    h1 = parts.get("h1")
    if not ts or not h1:
        return False

    try:
        if abs(time.time() - int(ts)) > 300:
            return False
    except ValueError:
        return False

    signed_payload = f"{ts}:{raw_body.decode('utf-8')}"
    expected = hmac.new(secret.encode("utf-8"), signed_payload.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, h1)


def get_or_create_customer(org_id: str, user_email: str) -> str:
    """Get existing customer ID or create a new Paddle customer. Raises on failure."""
    if not _paddle_configured():
        raise ValueError("Paddle is not configured")

    # Try to find existing customer by email
    try:
        with httpx.Client(timeout=30.0) as client:
            res = client.get(
                f"{settings.paddle_api_base}/customers",
                headers=_headers(),
                params={"email": user_email},
            )
            if res.status_code == 200:
                customers = res.json().get("data", [])
                if customers:
                    return customers[0].get("id")
    except Exception as exc:
        logger.debug("Customer lookup failed: %s", exc)

    # Create new customer
    data = _request("POST", "/customers", json_body={
        "email": user_email,
        "custom_data": {"org_id": org_id},
    })
    customer_id = data.get("id")
    if not customer_id:
        raise ValueError("Paddle did not return a customer ID")
    return customer_id


def _checkout_result(data: Dict[str, Any]) -> Dict[str, Any]:
    """Extract transaction ID and hosted checkout URL (when available).

    Paddle.js overlay checkout only needs the transaction ID. The hosted URL is
    only returned when an approved default payment link is configured, so treat
    it as an optional fallback rather than a requirement.
    """
    transaction_id = (data.get("id") or "").strip()
    checkout_url = ((data.get("checkout") or {}).get("url") or data.get("url") or "").strip()
    if not transaction_id and not checkout_url:
        raise ValueError("Paddle did not return a transaction ID or checkout URL")
    return {
        "checkout_url": checkout_url,
        "transaction_id": transaction_id,
        "mock": False,
    }


def create_checkout_url(
    *,
    org_id: str,
    user_email: str,
    plan: str,
    annual: bool,
    customer_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a Paddle transaction/checkout. Raises ValueError on failure."""
    plan = normalize_plan(plan)
    if plan == "starter":
        raise ValueError("Starter is free — no checkout needed.")

    price_id = price_id_for_plan(plan, annual)

    # Get or create customer
    if not customer_id:
        customer_id = get_or_create_customer(org_id, user_email)

    success_url = f"{settings.web_url}/billing?checkout=success"
    cancel_url = f"{settings.web_url}/billing?checkout=cancelled"

    payload: Dict[str, Any] = {
        "items": [{"price_id": price_id, "quantity": 1}],
        "customer_id": customer_id,
        "collection_mode": "automatic",
        "custom_data": {"org_id": org_id, "plan": plan, "annual": annual, "type": "subscription"},
        "checkout": {
            "settings": {
                "success_url": success_url,
                "cancel_url": cancel_url,
            },
        },
    }

    data = _request("POST", "/transactions", json_body=payload)
    logger.info("Paddle transaction response: %s", data)
    result = _checkout_result(data)
    result["plan"] = plan
    return result


def create_portal_url(customer_id: str) -> Dict[str, Any]:
    """Create a Paddle customer portal session. Raises ValueError on failure."""
    if not customer_id:
        raise ValueError("No Paddle customer ID — cannot create portal session")

    data = _request("POST", f"/customers/{customer_id}/portal-sessions", json_body={})
    portal_url = (data.get("urls") or {}).get("general", {}).get("overview")
    if not portal_url:
        raise ValueError("Paddle did not return a portal URL")
    return {"portal_url": portal_url, "mock": False}


def create_credit_pack_checkout(org_id: str, user_email: str) -> Dict[str, Any]:
    """Create checkout for WhatsApp credit pack. Raises ValueError on failure."""
    if not settings.paddle_price_id_whatsapp_500:
        raise ValueError("WhatsApp credit pack price ID not configured")

    customer_id = get_or_create_customer(org_id, user_email)

    success_url = f"{settings.web_url}/billing?credits=success"
    cancel_url = f"{settings.web_url}/billing?credits=cancelled"

    payload = {
        "items": [{"price_id": settings.paddle_price_id_whatsapp_500, "quantity": 1}],
        "customer_id": customer_id,
        "collection_mode": "automatic",
        "custom_data": {"org_id": org_id, "type": "whatsapp_credits", "credits": 500},
        "checkout": {
            "settings": {
                "success_url": success_url,
                "cancel_url": cancel_url,
            },
        },
    }

    data = _request("POST", "/transactions", json_body=payload)
    result = _checkout_result(data)
    result["credits"] = 500
    return result


def cancel_paddle_subscription(subscription_id: str) -> Dict[str, Any]:
    """Cancel a Paddle subscription at the end of the current billing period."""
    if not subscription_id:
        raise ValueError("No subscription ID to cancel")

    _request("POST", f"/subscriptions/{subscription_id}/cancel", json_body={
        "effective_from": "next_billing_period",
    })
    return {"cancelled": True, "mock": False}


def apply_subscription_to_org(org, plan: str, *, customer_id=None, subscription_id=None, annual=False):
    plan = normalize_plan(plan)
    org.plan = plan
    org.billing_period = "annual" if annual else "monthly"
    if customer_id:
        org.paddle_customer_id = customer_id
    if subscription_id:
        org.paddle_subscription_id = subscription_id
    apply_plan_quotas(org)
    org.whatsapp_used_this_period = 0
    org.collections_used_this_period = 0


def public_plans() -> list:
    return [
        {
            "id": key,
            "name": val["label"],
            "monthly": val["monthly"],
            "annual": val["annual"],
            "collections": PLAN_QUOTAS_SAFE(key),
            "whatsapp": {
                "starter": 0,
                "pro": 0,
                "pro_plus": 450,
                "team": 850,
            }.get(key, 0),
            "seats": 3 if key == "team" else 1,
        }
        for key, val in PLAN_PRICES.items()
    ]


def public_config() -> Dict[str, Any]:
    """Return Paddle config for frontend Paddle.js initialization."""
    paddle_env_lower = (settings.paddle_env or "production").lower()
    return {
        "enabled": _paddle_configured(),
        "environment": "sandbox" if paddle_env_lower == "sandbox" else "production",
        "client_token": settings.paddle_client_token,
        "api_base": settings.paddle_api_base,
    }


def PLAN_QUOTAS_SAFE(key: str):
    from app.services.plan_gating import PLAN_QUOTAS

    q = PLAN_QUOTAS.get(key, {}).get("collections")
    return q if q is not None else "unlimited"

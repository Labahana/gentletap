"""Paddle Billing v2 client + webhook signature verification."""

from __future__ import annotations

import hashlib
import hmac
import logging
import time
from typing import Any, Dict, Optional
from urllib.parse import urlencode

import httpx

from app.config import get_settings
from app.services.plan_gating import PLAN_PRICES, apply_plan_quotas, normalize_plan

logger = logging.getLogger(__name__)
settings = get_settings()


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
    return mapping.get((plan, annual), settings.paddle_price_id_pro_monthly or settings.paddle_price_id_pro)


def verify_paddle_signature(raw_body: bytes, signature_header: Optional[str]) -> bool:
    """
    Verify Paddle Billing webhook signature.
    Header format: ts=...;h1=...
    FAIL-CLOSED: an empty PADDLE_WEBHOOK_SECRET rejects every webhook (the
    secret was once committed to the repo — it must come from the environment
    and be rotated). Without this, anyone could forge subscription upgrades.
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


def _headers() -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.paddle_api_key}",
        "Content-Type": "application/json",
    }


def get_or_create_customer(org_id: str, user_email: str) -> Optional[str]:
    """Get existing customer ID or create a new Paddle customer."""
    if not settings.paddle_api_key:
        return None
    try:
        with httpx.Client(timeout=20.0) as client:
            # Try to find existing customer by email
            res = client.get(
                f"{settings.paddle_api_base}/customers",
                headers=_headers(),
                params={"email": user_email},
            )
            if res.status_code == 200:
                customers = res.json().get("data", [])
                if customers:
                    return customers[0].get("id")
            
            # Create new customer
            res = client.post(
                f"{settings.paddle_api_base}/customers",
                headers=_headers(),
                json={
                    "email": user_email,
                    "custom_data": {"org_id": org_id},
                },
            )
            if res.status_code in (200, 201):
                data = res.json().get("data", {})
                return data.get("id")
    except Exception as exc:
        logger.warning("Paddle customer error: %s", exc)
    return None


def create_checkout_url(
    *,
    org_id: str,
    user_email: str,
    plan: str,
    annual: bool,
    customer_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Create a Paddle transaction/checkout. Falls back to mock URL in dev."""
    plan = normalize_plan(plan)
    if plan == "starter":
        return {"checkout_url": None, "mock": True, "plan": plan}

    price_id = price_id_for_plan(plan, annual)
    if not settings.paddle_api_key or settings.paddle_api_key.startswith("test_"):
        # Dev mock checkout
        qs = urlencode({"org_id": org_id, "plan": plan, "annual": str(annual).lower()})
        return {
            "checkout_url": f"{settings.frontend_url}/billing?mock_checkout=1&{qs}",
            "mock": True,
            "plan": plan,
            "price_id": price_id,
        }

    # Get or create customer
    if not customer_id:
        customer_id = get_or_create_customer(org_id, user_email)
    if not customer_id:
        logger.error("Could not create Paddle customer for %s", user_email)
        return {"checkout_url": None, "mock": True, "plan": plan}

    success_url = f"{settings.frontend_url}/billing?checkout=success"
    cancel_url = f"{settings.frontend_url}/billing?checkout=cancelled"

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

    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                f"{settings.paddle_api_base}/transactions",
                headers=_headers(),
                json=payload,
            )
            if res.status_code in (200, 201):
                data = res.json().get("data", {})
                checkout_url = (data.get("checkout") or {}).get("url") or data.get("url")
                return {
                    "checkout_url": checkout_url,
                    "transaction_id": data.get("id"),
                    "mock": False,
                    "plan": plan,
                }
            logger.warning("Paddle checkout failed: %s %s", res.status_code, res.text[:300])
    except Exception as exc:
        logger.warning("Paddle checkout error: %s", exc)

    return {"checkout_url": None, "mock": True, "plan": plan}


def create_portal_url(customer_id: str) -> Dict[str, Any]:
    if not customer_id or not settings.paddle_api_key:
        return {"portal_url": f"{settings.frontend_url}/billing", "mock": True}
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                f"{settings.paddle_api_base}/customers/{customer_id}/portal-sessions",
                headers=_headers(),
                json={},
            )
            if res.status_code in (200, 201):
                data = res.json().get("data", {})
                return {"portal_url": data.get("urls", {}).get("general", {}).get("overview"), "mock": False}
    except Exception as exc:
        logger.warning("Paddle portal error: %s", exc)
    return {"portal_url": f"{settings.frontend_url}/billing", "mock": True}


def create_credit_pack_checkout(org_id: str, user_email: str) -> Dict[str, Any]:
    if not settings.paddle_api_key:
        return {
            "checkout_url": f"{settings.frontend_url}/billing?mock_credits=1&org_id={org_id}",
            "mock": True,
            "credits": 500,
            "amount": 15,
        }
    
    customer_id = get_or_create_customer(org_id, user_email)
    if not customer_id:
        logger.error("Could not create Paddle customer for credit pack: %s", user_email)
        return {"checkout_url": None, "mock": True, "credits": 500}

    success_url = f"{settings.frontend_url}/billing?credits=success"
    cancel_url = f"{settings.frontend_url}/billing?credits=cancelled"

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
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(f"{settings.paddle_api_base}/transactions", headers=_headers(), json=payload)
            if res.status_code in (200, 201):
                data = res.json().get("data", {})
                checkout_url = (data.get("checkout") or {}).get("url")
                return {
                    "checkout_url": checkout_url,
                    "transaction_id": data.get("id"),
                    "mock": False,
                    "credits": 500,
                }
    except Exception as exc:
        logger.warning("Credit pack checkout failed: %s", exc)
    return {"checkout_url": None, "mock": True, "credits": 500}


def cancel_paddle_subscription(subscription_id: str) -> Dict[str, Any]:
    """Cancel a Paddle subscription at the end of the current billing period."""
    if not subscription_id or not settings.paddle_api_key:
        return {"cancelled": False, "mock": True}
    try:
        with httpx.Client(timeout=20.0) as client:
            res = client.post(
                f"{settings.paddle_api_base}/subscriptions/{subscription_id}/cancel",
                headers=_headers(),
                json={"effective_from": "next_billing_period"},
            )
            if res.status_code in (200, 201):
                return {"cancelled": True, "mock": False}
            logger.warning("Paddle cancel failed: %s %s", res.status_code, res.text[:300])
    except Exception as exc:
        logger.warning("Paddle cancel error: %s", exc)
    return {"cancelled": False, "mock": True}


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


def PLAN_QUOTAS_SAFE(key: str):
    from app.services.plan_gating import PLAN_QUOTAS

    q = PLAN_QUOTAS.get(key, {}).get("collections")
    return q if q is not None else "unlimited"

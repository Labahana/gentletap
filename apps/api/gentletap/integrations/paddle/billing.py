"""Paddle Billing helpers — subscriptions, checkout, customer portal."""

from __future__ import annotations

import httpx
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import Profile
from gentletap.plans import PLAN_RANK, normalize_plan

PADDLE_SANDBOX = "https://sandbox-api.paddle.com"
PADDLE_PRODUCTION = "https://api.paddle.com"


def _api_base(settings: Settings) -> str:
    env = (settings.paddle_environment or "sandbox").lower()
    return PADDLE_SANDBOX if env == "sandbox" else PADDLE_PRODUCTION


def _paddle_configured(settings: Settings | None = None) -> bool:
    cfg = settings or get_settings()
    return bool(cfg.paddle_api_key.strip())


def _headers(settings: Settings) -> dict[str, str]:
    return {
        "Authorization": f"Bearer {settings.paddle_api_key}",
        "Content-Type": "application/json",
    }


def _request(settings: Settings, method: str, path: str, *, json_body: dict | None = None) -> dict:
    if not _paddle_configured(settings):
        raise ValueError("Paddle is not configured")
    url = f"{_api_base(settings)}{path}"
    with httpx.Client(timeout=30.0) as client:
        response = client.request(method, url, headers=_headers(settings), json=json_body)
        if response.status_code >= 400:
            detail = response.text[:500]
            raise ValueError(f"Paddle API error ({response.status_code}): {detail}")
        return response.json().get("data", response.json())


def price_id_for(settings: Settings, plan: str, interval: str) -> str | None:
    plan = normalize_plan(plan)
    if plan == "free":
        return None

    mapping: dict[tuple[str, str], str] = {
        ("pro", "month"): settings.paddle_price_id_pro_monthly or settings.paddle_price_id_pro,
        ("pro", "year"): settings.paddle_price_id_pro_annual,
        ("pro_plus", "month"): settings.paddle_price_id_pro_plus_monthly,
        ("pro_plus", "year"): settings.paddle_price_id_pro_plus_annual,
        ("team", "month"): settings.paddle_price_id_team_monthly,
        ("team", "year"): settings.paddle_price_id_team_annual,
    }
    price_id = mapping.get((plan, interval), "")
    return price_id.strip() or None


def build_price_to_plan_map(settings: Settings | None = None) -> dict[str, str]:
    settings = settings or get_settings()
    out: dict[str, str] = {}
    for plan in ("pro", "pro_plus", "team"):
        for interval in ("month", "year"):
            price_id = price_id_for(settings, plan, interval)
            if price_id:
                out[price_id] = plan
    return out


def plan_from_paddle_price(price_id: str, settings: Settings | None = None) -> str | None:
    return build_price_to_plan_map(settings).get(price_id)


def resolve_plan_from_items(items: list[dict], settings: Settings | None = None) -> str:
    settings = settings or get_settings()
    price_map = build_price_to_plan_map(settings)
    best = "free"
    for item in items or []:
        price_id = item.get("price_id") or (item.get("price") or {}).get("id")
        if not price_id:
            continue
        plan = price_map.get(price_id)
        if plan and PLAN_RANK.get(plan, 0) > PLAN_RANK.get(best, 0):
            best = plan
    return best


def resolve_plan_from_subscription(subscription: dict, settings: Settings | None = None) -> str:
    return resolve_plan_from_items(subscription.get("items", []), settings)


def whatsapp_credits_from_items(items: list[dict], settings: Settings | None = None) -> int:
    """Map purchased price IDs to message credits — never trust custom_data."""
    from gentletap.plans import WHATSAPP_MESSAGE_PACKS

    settings = settings or get_settings()
    price_to_credits: dict[str, int] = {}
    for pack, credits in WHATSAPP_MESSAGE_PACKS.items():
        price_id = whatsapp_pack_price_id(settings, pack)
        if price_id:
            price_to_credits[price_id] = int(credits)
    total = 0
    for item in items or []:
        price_id = item.get("price_id") or (item.get("price") or {}).get("id") or ""
        credits = price_to_credits.get(price_id)
        if credits:
            total += credits * int(item.get("quantity") or 1)
    return total


def get_or_create_customer(db: Session, user: Profile) -> str:
    settings = get_settings()
    if user.paddle_customer_id:
        return user.paddle_customer_id

    data = _request(
        settings,
        "POST",
        "/customers",
        json_body={
            "email": user.email,
            "name": user.full_name or user.email.split("@")[0],
            "custom_data": {"user_id": str(user.id)},
        },
    )
    customer_id = data.get("id", "")
    if not customer_id:
        raise ValueError("Paddle did not return a customer id")
    user.paddle_customer_id = customer_id
    db.commit()
    return customer_id


def public_config(settings: Settings | None = None) -> dict:
    """Client-side Paddle.js config (client token is publishable, safe to expose)."""
    settings = settings or get_settings()
    env = (settings.paddle_environment or "sandbox").lower()
    return {
        "client_token": settings.paddle_client_token.strip(),
        "environment": "sandbox" if env == "sandbox" else "production",
    }


def _checkout_result(data: dict) -> dict:
    """Return the transaction id and (when available) the hosted checkout URL.

    Paddle.js overlay checkout only needs the transaction id. The hosted URL is a
    fallback for when the frontend client token is not configured, and requires an
    approved default payment link in the Paddle dashboard.
    """
    transaction_id = (data.get("id") or "").strip()
    checkout = data.get("checkout") or {}
    url = (checkout.get("url") or "").strip()
    if not transaction_id and not url:
        raise ValueError(
            "Paddle transaction has no id or checkout URL — check your Paddle configuration"
        )
    return {"transaction_id": transaction_id, "checkout_url": url}


def create_checkout_session(
    db: Session,
    user: Profile,
    *,
    plan: str,
    interval: str,
    success_url: str,
    cancel_url: str,
    affiliate_ref: str | None = None,
    affiliate_id: str | None = None,
) -> dict:
    settings = get_settings()
    price_id = price_id_for(settings, plan, interval)
    if not price_id:
        raise ValueError(f"Paddle price not configured for {plan} ({interval})")

    customer_id = get_or_create_customer(db, user)
    custom_data: dict[str, str] = {
        "user_id": str(user.id),
        "plan": normalize_plan(plan),
        "interval": interval,
        "type": "subscription",
    }
    if affiliate_ref:
        custom_data["affiliate_ref"] = affiliate_ref
    if affiliate_id:
        custom_data["affiliate_id"] = affiliate_id

    body: dict = {
        "items": [{"price_id": price_id, "quantity": 1}],
        "customer_id": customer_id,
        "collection_mode": "automatic",
        "custom_data": custom_data,
        "checkout": {
            "settings": {
                "success_url": success_url,
                "cancel_url": cancel_url,
            },
        },
    }
    discount_id = (settings.paddle_discount_id_affiliate_referral or "").strip()
    if affiliate_ref and discount_id:
        body["discount_id"] = discount_id

    data = _request(
        settings,
        "POST",
        "/transactions",
        json_body=body,
    )
    return _checkout_result(data)


def create_portal_session(user: Profile, return_url: str) -> str:
    settings = get_settings()
    if not user.paddle_customer_id:
        raise ValueError("No Paddle customer on file")

    body: dict | None = None
    if user.paddle_subscription_id:
        body = {"subscription_ids": [user.paddle_subscription_id]}

    data = _request(
        settings,
        "POST",
        f"/customers/{user.paddle_customer_id}/portal-sessions",
        json_body=body,
    )
    urls = data.get("urls") or {}
    overview = (urls.get("general") or {}).get("overview")
    if overview:
        return overview
    raise ValueError("Paddle customer portal URL unavailable")


def apply_subscription_update(
    db: Session,
    user_id: str,
    plan: str,
    *,
    subscription_id: str | None = None,
) -> None:
    from uuid import UUID

    user = db.query(Profile).filter(Profile.id == UUID(user_id)).one_or_none()
    if user:
        user.plan = normalize_plan(plan) if plan in PLAN_RANK else "free"
        if subscription_id:
            user.paddle_subscription_id = subscription_id
        db.commit()


def whatsapp_pack_price_id(settings: Settings, pack: str) -> str | None:
    from gentletap.plans import WHATSAPP_MESSAGE_PACKS

    if pack not in WHATSAPP_MESSAGE_PACKS:
        return None
    mapping = {
        "pack_250": settings.paddle_price_id_whatsapp_250,
        "pack_500": settings.paddle_price_id_whatsapp_500,
    }
    price_id = (mapping.get(pack) or "").strip()
    return price_id or None


def create_whatsapp_pack_checkout(
    db: Session,
    user: Profile,
    *,
    pack: str,
    success_url: str,
    cancel_url: str,
) -> dict:
    from gentletap.plans import WHATSAPP_MESSAGE_PACKS

    settings = get_settings()
    price_id = whatsapp_pack_price_id(settings, pack)
    credits = WHATSAPP_MESSAGE_PACKS.get(pack)
    if not price_id or not credits:
        raise ValueError(f"Paddle price not configured for {pack}")

    customer_id = get_or_create_customer(db, user)
    data = _request(
        settings,
        "POST",
        "/transactions",
        json_body={
            "items": [{"price_id": price_id, "quantity": 1}],
            "customer_id": customer_id,
            "collection_mode": "automatic",
            "custom_data": {
                "user_id": str(user.id),
                "type": "whatsapp_credits",
                "pack": pack,
                "credits": str(credits),
            },
            "checkout": {
                "settings": {
                    "success_url": success_url,
                    "cancel_url": cancel_url,
                },
            },
        },
    )
    return _checkout_result(data)


def apply_whatsapp_credits(db: Session, user_id: str, credits: int) -> None:
    from uuid import UUID

    user = db.query(Profile).filter(Profile.id == UUID(user_id)).one_or_none()
    if user and credits > 0:
        user.whatsapp_message_credits = (user.whatsapp_message_credits or 0) + credits
        db.commit()


def catalog_with_availability(settings: Settings | None = None) -> list[dict]:
    from gentletap.plans import PLAN_CATALOG

    settings = settings or get_settings()
    items = []
    for entry in PLAN_CATALOG:
        plan_id = entry["id"]
        row = dict(entry)
        if plan_id == "free":
            row["checkout_monthly_available"] = False
            row["checkout_annual_available"] = False
        else:
            row["checkout_monthly_available"] = price_id_for(settings, plan_id, "month") is not None
            row["checkout_annual_available"] = price_id_for(settings, plan_id, "year") is not None
        items.append(row)
    return items

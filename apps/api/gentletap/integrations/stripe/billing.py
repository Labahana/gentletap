"""Stripe billing helpers."""

import stripe
from sqlalchemy.orm import Session

from gentletap.config import Settings, get_settings
from gentletap.database import Profile
from gentletap.plans import PLAN_RANK, normalize_plan


def _stripe():
    settings = get_settings()
    if not settings.stripe_secret_key:
        raise ValueError("Stripe is not configured")
    stripe.api_key = settings.stripe_secret_key
    return stripe


def price_id_for(settings: Settings, plan: str, interval: str) -> str | None:
    """Resolve Stripe Price ID for plan + billing interval."""
    plan = normalize_plan(plan)
    if plan == "free":
        return None

    mapping: dict[tuple[str, str], str] = {
        ("pro", "month"): settings.stripe_price_id_pro_monthly or settings.stripe_price_id_pro,
        ("pro", "year"): settings.stripe_price_id_pro_annual,
        ("pro_plus", "month"): settings.stripe_price_id_pro_plus_monthly,
        ("pro_plus", "year"): settings.stripe_price_id_pro_plus_annual,
        ("team", "month"): settings.stripe_price_id_team_monthly,
        ("team", "year"): settings.stripe_price_id_team_annual,
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


def plan_from_stripe_price(price_id: str, settings: Settings | None = None) -> str | None:
    return build_price_to_plan_map(settings).get(price_id)


def resolve_plan_from_subscription(subscription: dict, settings: Settings | None = None) -> str:
    """Pick the highest-tier plan from subscription line items."""
    settings = settings or get_settings()
    price_map = build_price_to_plan_map(settings)
    best = "free"
    for item in subscription.get("items", {}).get("data", []):
        price_id = item.get("price", {}).get("id")
        if not price_id:
            continue
        plan = price_map.get(price_id)
        if plan and PLAN_RANK.get(plan, 0) > PLAN_RANK.get(best, 0):
            best = plan
    return best


def get_or_create_customer(db: Session, user: Profile) -> str:
    st = _stripe()
    if user.stripe_customer_id:
        return user.stripe_customer_id

    customer = st.Customer.create(email=user.email, metadata={"user_id": str(user.id)})
    user.stripe_customer_id = customer.id
    db.commit()
    return customer.id


def create_checkout_session(
    db: Session,
    user: Profile,
    *,
    plan: str,
    interval: str,
    success_url: str,
    cancel_url: str,
) -> str:
    settings = get_settings()
    price_id = price_id_for(settings, plan, interval)
    if not price_id:
        raise ValueError(f"Stripe price not configured for {plan} ({interval})")

    st = _stripe()
    customer_id = get_or_create_customer(db, user)
    session = st.checkout.Session.create(
        customer=customer_id,
        mode="subscription",
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"user_id": str(user.id), "plan": plan, "interval": interval},
    )
    return session.url or ""


def create_portal_session(user: Profile, return_url: str) -> str:
    st = _stripe()
    if not user.stripe_customer_id:
        raise ValueError("No Stripe customer on file")
    session = st.billing_portal.Session.create(
        customer=user.stripe_customer_id,
        return_url=return_url,
    )
    return session.url


def apply_subscription_update(db: Session, user_id: str, plan: str) -> None:
    from uuid import UUID

    user = db.query(Profile).filter(Profile.id == UUID(user_id)).one_or_none()
    if user:
        user.plan = normalize_plan(plan) if plan in PLAN_RANK else "free"
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

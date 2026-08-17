"""Billing API — Paddle checkout, portal, plan changes."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.subscription import Subscription
from app.models.whatsapp_credit import WhatsAppCredit
from app.services.plan_gating import PLAN_PRICES, apply_plan_quotas, normalize_plan, require_owner
from app.services.paddle import (
    apply_subscription_to_org,
    create_checkout_url,
    create_credit_pack_checkout,
    create_portal_url,
)

router = APIRouter(prefix="/billing", tags=["Billing"])


class CheckoutRequest(BaseModel):
    plan: str
    annual: bool = False


class ChangePlanRequest(BaseModel):
    plan: str
    annual: bool = False


@router.post("/checkout")
def create_checkout(
    req: CheckoutRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    require_owner(user, org)
    plan = normalize_plan(req.plan)
    if plan == "starter":
        raise HTTPException(status_code=400, detail="Starter is free — no checkout needed.")
    result = create_checkout_url(
        org_id=org.id,
        user_email=user.email,
        plan=plan,
        annual=req.annual,
        customer_id=org.paddle_customer_id,
    )
    # Dev mock: immediately apply plan so local UX works without Paddle
    if result.get("mock"):
        apply_subscription_to_org(
            org,
            plan,
            customer_id=org.paddle_customer_id or f"cus_mock_{org.id[:8]}",
            subscription_id=org.paddle_subscription_id or f"sub_mock_{org.id[:8]}",
            annual=req.annual,
        )
        sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
        if not sub:
            sub = Subscription(org_id=org.id)
            db.add(sub)
        sub.plan = plan
        sub.status = "active"
        sub.paddle_customer_id = org.paddle_customer_id
        sub.paddle_subscription_id = org.paddle_subscription_id
        sub.current_period_start = datetime.now(timezone.utc)
        db.commit()
    return result


@router.get("/portal")
def get_portal(user_and_org=Depends(get_current_user_and_org)):
    user, org = user_and_org
    require_owner(user, org)
    return create_portal_url(org.paddle_customer_id or "")


@router.get("/subscription")
def get_subscription(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    plan = normalize_plan(org.plan)
    prices = PLAN_PRICES.get(plan, PLAN_PRICES["starter"])
    sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
    credits = (
        db.query(WhatsAppCredit)
        .filter(WhatsAppCredit.org_id == org.id, WhatsAppCredit.status == "active")
        .all()
    )
    credit_remaining = sum(max(0, c.credits_added - c.credits_used) for c in credits)
    return {
        "plan": plan,
        "billing_period": org.billing_period,
        "status": sub.status if sub else "active",
        "cancel_at_period_end": sub.cancel_at_period_end if sub else False,
        "current_period_end": sub.current_period_end.isoformat() if sub and sub.current_period_end else None,
        "price_monthly": prices["monthly"],
        "price_annual": prices["annual"],
        "usage": {
            "collections_used": org.collections_used_this_period,
            "collections_quota": org.collections_quota,
            "whatsapp_used": org.whatsapp_used_this_period,
            "whatsapp_quota": org.whatsapp_quota,
            "whatsapp_credits": credit_remaining,
        },
    }


@router.post("/cancel")
def cancel_subscription(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    require_owner(user, org)
    sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
    if not sub:
        raise HTTPException(status_code=404, detail="No active subscription")
    sub.cancel_at_period_end = True
    db.commit()
    return {"status": "cancelled_at_period_end"}


@router.post("/change-plan")
def change_plan(
    req: ChangePlanRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    require_owner(user, org)
    plan = normalize_plan(req.plan)
    if plan == "starter":
        apply_subscription_to_org(org, "starter")
        sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
        if sub:
            sub.plan = "starter"
            sub.status = "cancelled"
        db.commit()
        return {"plan": "starter", "status": "downgraded"}

    result = create_checkout_url(
        org_id=org.id,
        user_email=user.email,
        plan=plan,
        annual=req.annual,
        customer_id=org.paddle_customer_id,
    )
    if result.get("mock"):
        apply_subscription_to_org(org, plan, annual=req.annual)
        sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
        if not sub:
            sub = Subscription(org_id=org.id)
            db.add(sub)
        sub.plan = plan
        sub.status = "active"
        db.commit()
    return result


@router.post("/credit-packs")
def buy_credits(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = user_and_org
    require_owner(user, org)
    if normalize_plan(org.plan) not in ("pro_plus", "team"):
        raise HTTPException(status_code=403, detail="Upgrade to Pro+ to unlock WhatsApp.")
    result = create_credit_pack_checkout(org.id, user.email)
    if result.get("mock"):
        db.add(
            WhatsAppCredit(
                org_id=org.id,
                paddle_transaction_id=f"txn_mock_{org.id[:8]}",
                amount_paid=15.0,
                credits_added=500,
                credits_used=0,
                status="active",
            )
        )
        db.commit()
        result["applied"] = True
    return result


@router.get("/invoices")
def list_invoices(user_and_org=Depends(get_current_user_and_org)):
    user, org = user_and_org
    require_owner(user, org)
    # Paddle invoice list — mock for local
    return {
        "invoices": [
            {
                "id": "inv_mock_1",
                "date": datetime.now(timezone.utc).date().isoformat(),
                "amount": PLAN_PRICES.get(normalize_plan(org.plan), {}).get("monthly", 0),
                "status": "paid",
                "download_url": None,
            }
        ]
        if normalize_plan(org.plan) != "starter"
        else []
    }

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import get_db
from gentletap.dependencies import CurrentUser
from gentletap.integrations.paddle import billing as paddle_billing
from gentletap.plans import plan_display_name
from gentletap.schemas.billing import BillingStatusResponse, CheckoutRequest, PlanFeature

router = APIRouter(prefix="/billing", tags=["billing"])


@router.get("/status", response_model=BillingStatusResponse)
def billing_status(user: CurrentUser) -> BillingStatusResponse:
    settings = get_settings()
    catalog = paddle_billing.catalog_with_availability(settings)
    checkout_available = any(
        p["checkout_monthly_available"] or p["checkout_annual_available"]
        for p in catalog
        if p["id"] != "free"
    )
    return BillingStatusResponse(
        plan=user.plan,
        plan_display_name=plan_display_name(user.plan),
        paddle_customer_id=user.paddle_customer_id,
        checkout_available=checkout_available,
        plans=[PlanFeature(**p) for p in catalog],
    )


@router.get("/plans")
def list_plans() -> dict:
    settings = get_settings()
    return {"items": paddle_billing.catalog_with_availability(settings)}


@router.post("/checkout")
def checkout(
    body: CheckoutRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    settings = get_settings()
    try:
        if body.return_to == "onboarding":
            success_url = f"{settings.web_url}/onboarding?paid=1"
            cancel_url = f"{settings.web_url}/onboarding?checkout=cancelled"
        else:
            success_url = f"{settings.web_url}/settings/billing?success=1"
            cancel_url = f"{settings.web_url}/settings/billing?cancelled=1"
        url = paddle_billing.create_checkout_session(
            db,
            user,
            plan=body.plan,
            interval=body.interval,
            success_url=success_url,
            cancel_url=cancel_url,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"checkout_url": url}


@router.get("/portal")
def portal(user: CurrentUser) -> dict:
    settings = get_settings()
    try:
        url = paddle_billing.create_portal_session(user, return_url=f"{settings.web_url}/settings/billing")
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"portal_url": url}

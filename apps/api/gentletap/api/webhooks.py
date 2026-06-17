import json

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Profile, get_db
from gentletap.integrations.quickbooks import webhooks as qb_webhooks
from gentletap.integrations.resend import webhooks as resend_webhooks
from gentletap.integrations.stripe import billing as stripe_billing

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


@router.post("/quickbooks")
async def quickbooks_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await request.body()
    signature = request.headers.get("intuit-signature")
    if not qb_webhooks.verify_signature(payload, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    data = json.loads(payload.decode())
    qb_webhooks.handle_webhook_event(db, data)
    return {"received": True}


@router.post("/resend")
async def resend_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await request.body()
    signature = request.headers.get("svix-signature") or request.headers.get("resend-signature")
    if get_settings().resend_webhook_secret and not resend_webhooks.verify_signature(payload, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    data = json.loads(payload.decode())
    resend_webhooks.handle_webhook_event(db, data)
    return {"received": True}


@router.post("/stripe")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    import stripe

    settings = get_settings()
    if not settings.stripe_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe webhooks not configured")

    payload = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    stripe.api_key = settings.stripe_secret_key
    try:
        event = stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        user_id = session.get("metadata", {}).get("user_id")
        if user_id:
            plan = session.get("metadata", {}).get("plan") or "pro"
            stripe_billing.apply_subscription_update(db, user_id, plan)
    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.updated"):
        sub = event["data"]["object"]
        status_value = sub.get("status")
        customer_id = sub.get("customer")
        user = db.query(Profile).filter(Profile.stripe_customer_id == customer_id).one_or_none()
        if user:
            if status_value in ("active", "trialing"):
                plan = stripe_billing.resolve_plan_from_subscription(sub, settings)
            else:
                plan = "free"
            stripe_billing.apply_subscription_update(db, str(user.id), plan)

    return {"received": True}

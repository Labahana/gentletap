"""WhatsApp connection and usage API."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import WhatsappInboundMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.integrations.paddle import billing as paddle_billing
from gentletap.integrations.twilio.shared_sender import platform_webhook_config
from gentletap.plans import has_whatsapp
from gentletap.services.whatsapp_connection import (
    connect_shared,
    connection_status,
    disconnect,
)
from gentletap.services.whatsapp_usage import whatsapp_usage_summary

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class MessagePackCheckoutRequest(BaseModel):
    pack: str = Field(..., pattern="^(pack_250|pack_500)$")


@router.get("/status")
def whatsapp_status(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    conn = connection_status(db, user)
    usage = whatsapp_usage_summary(db, user)
    return {
        "plan_eligible": has_whatsapp(user.plan),
        **conn,
        **usage,
    }


@router.get("/platform-config")
def whatsapp_platform_config(user: CurrentUser) -> dict:
    """Webhook URLs for Twilio Console setup (admin reference)."""
    if not has_whatsapp(user.plan):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="WhatsApp requires Pro+ or Team",
        )
    return platform_webhook_config(get_settings())


@router.get("/inbound")
def list_inbound_messages(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    rows = (
        db.query(WhatsappInboundMessage)
        .filter(WhatsappInboundMessage.user_id == user.id)
        .order_by(WhatsappInboundMessage.created_at.desc())
        .limit(30)
        .all()
    )
    return {
        "items": [
            {
                "id": str(row.id),
                "from_phone": row.from_phone,
                "body": row.body,
                "invoice_id": str(row.invoice_id) if row.invoice_id else None,
                "created_at": row.created_at.isoformat() if row.created_at else None,
            }
            for row in rows
        ]
    }


@router.post("/connect/shared")
def whatsapp_connect_shared(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if not has_whatsapp(user.plan):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="WhatsApp requires Pro+ or Team",
        )
    try:
        connect_shared(db, user)
        db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"connected": True, "mode": "shared", "message": "Using GentleTap WhatsApp number"}


@router.post("/disconnect")
def whatsapp_disconnect(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    disconnect(db, user.id)
    db.commit()
    return {"connected": False}


@router.post("/checkout-messages")
def whatsapp_checkout_messages(
    body: MessagePackCheckoutRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    if not has_whatsapp(user.plan):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="WhatsApp requires Pro+ or Team",
        )
    settings = get_settings()
    try:
        url = paddle_billing.create_whatsapp_pack_checkout(
            db,
            user,
            pack=body.pack,
            success_url=f"{settings.web_url}/settings/connections?whatsapp_purchased=1",
            cancel_url=f"{settings.web_url}/settings/connections?cancelled=1",
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return {"checkout_url": url}

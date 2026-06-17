"""WhatsApp connection and usage API."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import WhatsappInboundMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.integrations.paddle import billing as paddle_billing
from gentletap.integrations.twilio.embedded_signup import (
    complete_embedded_signup,
    embedded_signup_public_config,
    is_embedded_signup_configured,
)
from gentletap.plans import has_whatsapp
from gentletap.services.whatsapp_connection import (
    connect_own,
    connect_shared,
    connection_status,
    disconnect,
)
from gentletap.services.whatsapp_usage import whatsapp_usage_summary

router = APIRouter(prefix="/whatsapp", tags=["whatsapp"])


class ConnectOwnRequest(BaseModel):
    phone_e164: str = Field(..., min_length=8, max_length=20, examples=["+15551234567"])
    waba_id: str | None = Field(default=None, min_length=5, max_length=64)
    meta_code: str | None = Field(default=None, max_length=512)
    meta_phone_number_id: str | None = Field(default=None, max_length=64)


class EmbeddedSignupCompleteRequest(BaseModel):
    waba_id: str = Field(..., min_length=5, max_length=64)
    phone_e164: str = Field(..., min_length=8, max_length=20)
    meta_phone_number_id: str | None = Field(default=None, max_length=64)
    meta_code: str | None = Field(default=None, max_length=512)


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


@router.get("/embedded-signup/config")
def embedded_signup_config() -> dict:
    return embedded_signup_public_config()


@router.post("/embedded-signup/complete")
def embedded_signup_complete(
    body: EmbeddedSignupCompleteRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    if not has_whatsapp(user.plan):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="WhatsApp requires Pro+ or Team",
        )
    if not is_embedded_signup_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Meta Embedded Signup is not configured",
        )
    try:
        conn = complete_embedded_signup(
            db,
            user,
            waba_id=body.waba_id,
            phone_e164=body.phone_e164,
            meta_phone_number_id=body.meta_phone_number_id,
            meta_code=body.meta_code,
        )
        db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {
        "connected": conn.status == "active",
        "mode": "own",
        "phone": conn.phone_e164,
        "status": conn.status,
        "sender_sid": conn.sender_sid,
        "message": (
            "Your business number is connected"
            if conn.status == "active"
            else "Registration in progress — we will activate when Twilio reports ONLINE"
        ),
    }


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
    return {"connected": True, "mode": "shared", "message": "Using GentleTap business number"}


@router.post("/connect/own")
def whatsapp_connect_own(
    body: ConnectOwnRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    if not has_whatsapp(user.plan):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="WhatsApp requires Pro+ or Team",
        )
    try:
        conn = connect_own(
            db,
            user,
            phone_e164=body.phone_e164,
            waba_id=body.waba_id,
            meta_code=body.meta_code,
            meta_phone_number_id=body.meta_phone_number_id,
        )
        settings = get_settings()
        if settings.whatsapp_own_auto_activate and not body.waba_id:
            conn.status = "active"
        db.commit()
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    registering = conn.status == "registering"
    return {
        "connected": conn.status == "active",
        "mode": "own",
        "phone": conn.phone_e164,
        "status": conn.status,
        "message": (
            "Your business number is connected"
            if conn.status == "active"
            else (
                "Registration in progress — we will activate when Twilio reports ONLINE"
                if registering
                else "Number saved — add your WABA ID or use Login with Facebook to complete registration"
            )
        ),
    }


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

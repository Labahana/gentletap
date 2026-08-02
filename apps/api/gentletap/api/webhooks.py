import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import ReminderMessage, WhatsappConnection, get_db
from gentletap.integrations.paddle import webhooks as paddle_webhooks
from gentletap.integrations.freshbooks import webhooks as fb_webhooks
from gentletap.integrations.quickbooks import webhooks as qb_webhooks
from gentletap.integrations.resend import webhooks as resend_webhooks
from gentletap.integrations.twilio.phone import normalize_phone_e164, phones_match
from gentletap.integrations.twilio.webhook_verify import verify_twilio_signature
from gentletap.rate_limit import limiter
from gentletap.services.whatsapp_inbound import handle_inbound_whatsapp
from gentletap.services.whatsapp_routing import routed_via_for_to_phone
from gentletap.utils.crypto import decrypt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["webhooks"])


def _twilio_auth_for_inbound(db: Session, to_phone: str) -> str:
    settings = get_settings()
    if not settings.twilio_auth_token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Twilio webhooks not configured",
        )

    normalized_to = normalize_phone_e164(to_phone.replace("whatsapp:", ""))
    if normalized_to:
        matches = (
            db.query(WhatsappConnection)
            .filter(
                WhatsappConnection.disconnected_at.is_(None),
                WhatsappConnection.phone_e164 == normalized_to,
                WhatsappConnection.twilio_subaccount_token_enc.isnot(None),
            )
            .limit(1)
            .all()
        )
        if not matches:
            # Fallback: format variants stored without strict normalization.
            matches = (
                db.query(WhatsappConnection)
                .filter(
                    WhatsappConnection.disconnected_at.is_(None),
                    WhatsappConnection.phone_e164.isnot(None),
                    WhatsappConnection.twilio_subaccount_token_enc.isnot(None),
                )
                .limit(50)
                .all()
            )
            for conn in matches:
                if conn.phone_e164 and phones_match(conn.phone_e164, normalized_to):
                    token = decrypt_token(conn.twilio_subaccount_token_enc or "")
                    if token:
                        return token
        else:
            token = decrypt_token(matches[0].twilio_subaccount_token_enc or "")
            if token:
                return token
    return settings.twilio_auth_token


def _verify_twilio(request: Request, params: dict[str, str], db: Session) -> None:
    settings = get_settings()
    auth_token = _twilio_auth_for_inbound(db, params.get("To", ""))
    signature = request.headers.get("X-Twilio-Signature")
    url = f"{settings.api_url.rstrip('/')}{request.url.path}"
    if not verify_twilio_signature(
        url=url,
        params=params,
        signature=signature,
        auth_token=auth_token,
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Twilio signature")


@router.post("/quickbooks")
@limiter.exempt
async def quickbooks_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await request.body()
    signature = request.headers.get("intuit-signature")
    if not qb_webhooks.verify_signature(payload, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    data = json.loads(payload.decode())
    qb_webhooks.handle_webhook_event(db, data)
    return {"received": True}


@router.post("/freshbooks")
@limiter.exempt
async def freshbooks_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    payload = await request.body()
    signature = request.headers.get("X-FreshBooks-Hmac-SHA256") or request.headers.get(
        "x-freshbooks-hmac-sha256"
    )
    form = fb_webhooks.parse_form_body(payload)
    result = fb_webhooks.handle_webhook_post(db, form=form, signature=signature)
    if result.get("status") == "invalid_signature":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    return {"received": True, **result}


@router.post("/resend")
@limiter.exempt
async def resend_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    if not settings.resend_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Resend webhooks not configured")
    payload = await request.body()
    headers = {k: v for k, v in request.headers.items()}
    if not resend_webhooks.verify_signature(payload, headers):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")
    data = json.loads(payload.decode())
    resend_webhooks.handle_webhook_event(db, data)
    return {"received": True}


@router.get("/paddle")
@limiter.exempt
async def paddle_checkout_return(
    _ptxn: str | None = Query(None),
) -> RedirectResponse:
    """Paddle appends ?_ptxn= after hosted checkout. Redirect browsers to billing."""
    settings = get_settings()
    if not _ptxn:
        raise HTTPException(status_code=status.HTTP_405_METHOD_NOT_ALLOWED, detail="Webhooks accept POST only")
    base = settings.web_url.rstrip("/")
    return RedirectResponse(url=f"{base}/settings/billing?success=1", status_code=status.HTTP_302_FOUND)


@router.post("/paddle")
@limiter.exempt
async def paddle_webhook(request: Request, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    if not settings.paddle_webhook_secret:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Paddle webhooks not configured")

    payload = await request.body()
    signature = request.headers.get("Paddle-Signature", "")
    if not paddle_webhooks.verify_signature(payload, signature):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid Paddle signature")

    data = json.loads(payload.decode())
    paddle_webhooks.handle_webhook_event(db, data, settings)
    return {"received": True}


@router.post("/twilio/whatsapp")
@limiter.exempt
async def twilio_whatsapp_inbound(request: Request, db: Session = Depends(get_db)) -> Response:
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}
    _verify_twilio(request, params, db)

    from_phone = params.get("From", "")
    to_phone = params.get("To", "")
    body = params.get("Body", "")
    message_sid = params.get("MessageSid")

    if from_phone and body:
        routed = routed_via_for_to_phone(db, to_phone)
        try:
            handle_inbound_whatsapp(
                db,
                from_phone=from_phone,
                to_phone=to_phone,
                body=body,
                external_sid=message_sid,
                routed_via=routed,
            )
            db.commit()
        except ValueError as exc:
            db.rollback()
            logger.warning("Unroutable WhatsApp inbound from=%s to=%s: %s", from_phone, to_phone, exc)

    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        media_type="application/xml",
    )


@router.post("/twilio/whatsapp/status")
@limiter.exempt
async def twilio_whatsapp_status(request: Request, db: Session = Depends(get_db)) -> dict:
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}
    _verify_twilio(request, params, db)

    message_sid = params.get("MessageSid")
    message_status = (params.get("MessageStatus") or "").lower()
    if message_sid:
        msg = (
            db.query(ReminderMessage)
            .filter(ReminderMessage.external_message_id == message_sid)
            .one_or_none()
        )
        if msg:
            if message_status in ("delivered", "read", "sent"):
                if msg.status != "sent":
                    msg.status = "sent"
            elif message_status in ("failed", "undelivered"):
                msg.status = "failed"
                msg.error_message = params.get("ErrorMessage") or message_status
            db.commit()

    return {"received": True}

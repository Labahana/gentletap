from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.message import Message
from app.models.invoice import Invoice
from app.models.suppression import Suppression
from app.models.audit_log import AuditLog
from app.config import get_settings
from app.services.email import apply_resend_event_to_message, decode_unsubscribe_token
from app.services.payment_detect import (
    detect_and_stop_if_paid,
    refresh_invoice_from_provider,
)
from app.services.webhook_security import (
    verify_freshbooks,
    verify_intuit,
    verify_svix,
    verify_twilio,
)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/resend")
async def resend_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    if not verify_svix(
        get_settings().resend_webhook_secret,
        raw,
        msg_id=request.headers.get("svix-id"),
        timestamp=request.headers.get("svix-timestamp"),
        signature=request.headers.get("svix-signature"),
    ):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    payload = await request.json()
    event_type = payload.get("type")
    data = payload.get("data", {})
    email_id = data.get("email_id")

    if not email_id:
        return {"status": "ignored", "reason": "missing email_id"}

    msg = db.query(Message).filter(Message.provider_message_id == email_id).first()
    if not msg:
        return {"status": "ignored", "reason": "message record not found"}

    now = datetime.now(timezone.utc)
    updated = apply_resend_event_to_message(msg, event_type, now)

    # Opt-out / bounce suppression
    to_addrs = data.get("to") or []
    if isinstance(to_addrs, str):
        to_addrs = [to_addrs]
    if event_type in ("email.bounced", "email.complained"):
        for addr in to_addrs:
            addr = (addr or "").lower()
            if not addr:
                continue
            bounce_count = (
                db.query(Message)
                .filter(Message.org_id == msg.org_id, Message.status == "bounced")
                .count()
            )
            if event_type == "email.complained" or bounce_count >= 3:
                existing = (
                    db.query(Suppression)
                    .filter(
                        Suppression.org_id == msg.org_id,
                        Suppression.email_or_phone == addr,
                        Suppression.channel == "email",
                    )
                    .first()
                )
                if not existing:
                    db.add(
                        Suppression(
                            org_id=msg.org_id,
                            email_or_phone=addr,
                            channel="email",
                            source=event_type,
                        )
                    )
                    try:
                        from app.tasks.handle_opt_out import handle_opt_out_task

                        handle_opt_out_task.delay("email", addr, msg.org_id, event_type)
                    except Exception:
                        pass

    db.commit()
    return {"status": "updated" if updated else "ignored", "message_id": msg.id, "event": event_type}


@router.post("/quickbooks")
async def quickbooks_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    # Fail-closed: forged "balance: 0" payloads could fake payment detection.
    if not verify_intuit(raw, request.headers.get("Intuit-Signature")):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    import json as _json

    payload = _json.loads(raw)
    # Payload ids are provider ids, never our own PKs — resolve them to invoices by
    # external_id before touching anything.
    invoice_ids = []

    def _resolve_ext(value):
        if not value:
            return
        inv = db.query(Invoice).filter(Invoice.external_id == str(value)).first()
        if inv:
            invoice_ids.append(inv.id)

    for key in ("invoice_id", "id", "external_id"):
        _resolve_ext(payload.get(key))
    for note in payload.get("eventNotifications", []) or []:
        for entity in (note.get("dataChangeEvent") or {}).get("entities", []) or []:
            if entity.get("name") == "Invoice":
                _resolve_ext(entity.get("id"))

    results = []
    for iid in set(invoice_ids):
        inv = db.query(Invoice).filter(Invoice.id == iid).first()
        if not inv:
            continue
        # Nothing in the payload is trusted as a payment fact — not the numeric
        # balance, not the status. A signature only proves who sent it. Every event
        # is a trigger to re-read the invoice from QuickBooks and reconcile.
        try:
            from app.tasks.payment_detect import payment_detect_invoice_task

            payment_detect_invoice_task.delay(inv.id)
        except Exception:
            if refresh_invoice_from_provider(db, inv, method="quickbooks_webhook") is None:
                detect_and_stop_if_paid(db, inv, method="quickbooks_webhook")
        results.append(inv.id)
    db.commit()
    return {"status": "ok", "processed": len(results), "results": results}


@router.post("/freshbooks")
async def freshbooks_webhook(request: Request, db: Session = Depends(get_db)):
    raw = await request.body()
    if not verify_freshbooks(raw, request.headers.get("X-FreshBooks-Hmac-Sha256")):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    import json as _json

    payload = _json.loads(raw)
    invoice_ids = []

    def _resolve_ext(value):
        if not value:
            return
        inv = db.query(Invoice).filter(Invoice.external_id == str(value)).first()
        if inv:
            invoice_ids.append(inv.id)

    for key in ("invoice_id", "object_id", "external_id"):
        _resolve_ext(payload.get(key))

    results = []
    for iid in set(invoice_ids):
        inv = db.query(Invoice).filter(Invoice.id == iid).first()
        if not inv:
            continue
        # Same rule as QuickBooks: the HMAC proves origin, not the numbers. Confirm
        # the balance against FreshBooks before stopping reminders.
        try:
            from app.tasks.payment_detect import payment_detect_invoice_task

            payment_detect_invoice_task.delay(inv.id)
        except Exception:
            if refresh_invoice_from_provider(db, inv, method="freshbooks_webhook") is None:
                detect_and_stop_if_paid(db, inv, method="freshbooks_webhook")
        results.append(inv.id)
    db.commit()
    return {"status": "ok", "processed": len(results), "results": results}


@router.get("/unsubscribe")
@router.post("/unsubscribe")
def unsubscribe(
    token: str = Query(...),
    db: Session = Depends(get_db),
):
    try:
        data = decode_unsubscribe_token(token)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid unsubscribe token")

    if data.get("purpose") != "unsubscribe":
        raise HTTPException(status_code=400, detail="Invalid token purpose")

    org_id = data["org_id"]
    email = data["email"].lower()
    existing = (
        db.query(Suppression)
        .filter(
            Suppression.org_id == org_id,
            Suppression.email_or_phone == email,
            Suppression.channel == "email",
        )
        .first()
    )
    if not existing:
        db.add(
            Suppression(
                org_id=org_id,
                email_or_phone=email,
                channel="email",
                source="unsubscribe_link",
            )
        )
        db.add(
            AuditLog(
                org_id=org_id,
                actor_type="system",
                action="opt_out",
                entity_type="suppression",
                details={"email": email, "source": "unsubscribe_link"},
            )
        )
        try:
            from app.tasks.handle_opt_out import handle_opt_out_task

            handle_opt_out_task.delay("email", email, org_id, "unsubscribe_link")
        except Exception:
            # Cancel pending inline
            from app.models.client import Client
            from app.models.reminder_schedule import ReminderSchedule

            clients = db.query(Client).filter(Client.org_id == org_id, Client.email == email).all()
            for c in clients:
                invs = db.query(Invoice).filter(Invoice.client_id == c.id).all()
                for inv in invs:
                    for row in (
                        db.query(ReminderSchedule)
                        .filter(
                            ReminderSchedule.invoice_id == inv.id,
                            ReminderSchedule.status == "pending",
                        )
                        .all()
                    ):
                        row.status = "cancelled"
                        row.skip_reason = "opt_out"
    db.commit()
    return {"status": "unsubscribed", "email": email}


@router.post("/paddle")
async def paddle_webhook(request: Request, db: Session = Depends(get_db)):
    from app.services.paddle import verify_paddle_signature, apply_subscription_to_org
    from app.models.organization import Organization
    from app.models.subscription import Subscription
    from app.models.whatsapp_credit import WhatsAppCredit
    from app.services.email import send_email_via_resend
    from app.models.user import User

    raw = await request.body()
    sig = request.headers.get("Paddle-Signature")
    if not verify_paddle_signature(raw, sig):
        raise HTTPException(status_code=401, detail="Invalid Paddle signature")

    payload = await request.json()
    event_type = payload.get("event_type") or payload.get("eventType") or ""
    data = payload.get("data") or {}
    custom = data.get("custom_data") or {}
    org_id = custom.get("org_id")
    plan = custom.get("plan") or "pro"
    annual = bool(custom.get("annual"))

    if not org_id and data.get("id"):
        # try lookup by subscription id
        sub = (
            db.query(Subscription)
            .filter(Subscription.paddle_subscription_id == data.get("id"))
            .first()
        )
        if sub:
            org_id = sub.org_id

    org = db.query(Organization).filter(Organization.id == org_id).first() if org_id else None

    if event_type in ("subscription.created", "subscription.activated", "subscription.updated"):
        if org:
            # Honour the ACTUAL subscription state from the verified payload —
            # Paddle sends subscription.updated when a user cancels at period
            # end or a sub goes past due. Blindly forcing "active" here would
            # silently re-grant entitlement to a cancelled/past-due account.
            raw_status = (data.get("status") or "active").lower()
            status_map = {
                "active": "active",
                "trialing": "active",
                "past_due": "past_due",
                "paused": "past_due",
                "canceled": "cancelled",
                "cancelled": "cancelled",
            }
            new_status = status_map.get(raw_status, "active")
            cancel_at_end = bool(data.get("cancel_at_period_end"))
            apply_subscription_to_org(
                org,
                plan,
                customer_id=data.get("customer_id"),
                subscription_id=data.get("id"),
                annual=annual,
            )
            sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
            if not sub:
                sub = Subscription(org_id=org.id)
                db.add(sub)
            sub.paddle_subscription_id = data.get("id") or sub.paddle_subscription_id
            sub.paddle_customer_id = data.get("customer_id") or org.paddle_customer_id
            sub.plan = org.plan
            sub.status = new_status
            sub.cancel_at_period_end = cancel_at_end
            if new_status == "active" and not cancel_at_end:
                sub.past_due_since = None
                sub.current_period_start = datetime.now(timezone.utc)

    elif event_type == "subscription.canceled" or event_type == "subscription.cancelled":
        if org:
            sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
            if sub:
                sub.cancel_at_period_end = True
                sub.status = "cancelled"
            owner = db.query(User).filter(User.id == org.owner_user_id).first()
            if owner:
                send_email_via_resend(
                    owner.email,
                    "GentleTap subscription cancelled",
                    f"Your subscription for {org.name} will end at the current period.",
                )

    elif event_type in ("subscription.past_due", "subscription.payment_failed"):
        if org:
            sub = db.query(Subscription).filter(Subscription.org_id == org.id).first()
            if not sub:
                sub = Subscription(org_id=org.id, plan=org.plan)
                db.add(sub)
            sub.status = "past_due"
            sub.past_due_since = sub.past_due_since or datetime.now(timezone.utc)
            owner = db.query(User).filter(User.id == org.owner_user_id).first()
            if owner:
                send_email_via_resend(
                    owner.email,
                    "GentleTap payment failed — 7-day grace period",
                    f"Hi,\n\nPayment for {org.name} failed. Update your billing method within 7 days "
                    f"to avoid downgrade to Starter.\n\n— GentleTap",
                )

    elif event_type in ("transaction.completed", "transaction.paid"):
        if custom.get("type") == "whatsapp_credits" and org:
            txn_id = data.get("id")
            # Idempotency: Paddle retries at-least-once, so a duplicate
            # transaction.completed must not double-grant credits.
            existing = (
                db.query(WhatsAppCredit)
                .filter(WhatsAppCredit.paddle_transaction_id == txn_id)
                .first()
                if txn_id
                else None
            )
            if not existing:
                # Record the ACTUAL paid amount rather than a hardcoded figure.
                try:
                    paid = float(data.get("amount_paid") or 0.0)
                except (TypeError, ValueError):
                    paid = 0.0
                db.add(
                    WhatsAppCredit(
                        org_id=org.id,
                        paddle_transaction_id=txn_id,
                        amount_paid=paid,
                        credits_added=int(custom.get("credits") or 500),
                        credits_used=0,
                        status="active",
                    )
                )
        elif org:
            # Affiliate commission recording (subscription payments only).
            from app.services import affiliates as affiliate_service

            txn_id = str(data.get("id") or "")
            gross, currency = affiliate_service.paddle_transaction_gross(data)
            if txn_id and gross > 0:
                referral = affiliate_service.referral_for_org(db, org.id)
                event_kind = (
                    "initial"
                    if referral and not referral.first_paid_at
                    else "renewal"
                )
                affiliate_service.record_subscription_commission(
                    db,
                    org=org,
                    paddle_transaction_id=txn_id,
                    paddle_subscription_id=data.get("subscription_id"),
                    gross_amount=gross,
                    currency=currency,
                    event_type=event_kind,
                )

    elif event_type in ("adjustment.created", "adjustment.updated"):
        # Refunds/chargebacks — claw back the associated commission.
        from app.services import affiliates as affiliate_service

        if (data.get("action") or "").lower() in ("refund", "chargeback"):
            txn_id = data.get("transaction_id") or ""
            if txn_id:
                try:
                    affiliate_service.clawback_commission(db, str(txn_id))
                except Exception:  # noqa: BLE001 - never fail the webhook on clawback
                    pass

    db.commit()
    return {"status": "ok", "event": event_type}


@router.post("/twilio")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    form = dict(await request.form())
    if not verify_twilio(
        str(request.url), form, request.headers.get("X-Twilio-Signature")
    ):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    message_sid = form.get("MessageSid") or form.get("SmsSid")
    status = (form.get("MessageStatus") or form.get("SmsStatus") or "").lower()
    body = (form.get("Body") or "").strip()
    from_number = (form.get("From") or "").replace("whatsapp:", "")

    if message_sid:
        msg = db.query(Message).filter(Message.provider_message_id == message_sid).first()
        if msg:
            if status in ("delivered", "sent", "read"):
                msg.status = "delivered" if status == "delivered" else msg.status
                if status == "delivered":
                    msg.delivered_at = datetime.now(timezone.utc)
            elif status in ("failed", "undelivered"):
                msg.status = "failed"

    # Inbound reply / opt-out
    if body:
        upper = body.upper()
        is_opt_out = upper in ("STOP", "UNSUBSCRIBE", "CANCEL")

        # Persist every inbound message (depth: full inbound log)
        try:
            from app.models.whatsapp_inbound import WhatsappInboundMessage
            from app.models.client import Client as _Client

            matched_client = None
            matched_org_id = None
            if from_number and len(from_number) >= 10:
                candidates = (
                    db.query(_Client)
                    .filter(_Client.phone.contains(from_number[-10:]))
                    .limit(5)
                    .all()
                )
                if candidates:
                    matched_client = candidates[0]
                    matched_org_id = matched_client.org_id
            # org_id is NOT nullable — only persist when attributable via a
            # known client phone number; unmatchable numbers are skipped.
            if matched_org_id and message_sid:
                exists = (
                    db.query(WhatsappInboundMessage)
                    .filter(WhatsappInboundMessage.message_sid == message_sid)
                    .one_or_none()
                )
                if not exists:
                    db.add(
                        WhatsappInboundMessage(
                            org_id=matched_org_id,
                            client_id=matched_client.id if matched_client else None,
                            from_number=from_number or "",
                            profile_name=(form.get("ProfileName") or None),
                            body=body,
                            message_sid=message_sid,
                            opt_out=is_opt_out,
                        )
                    )
        except Exception:  # noqa: BLE001 - logging must never break the webhook
            db.rollback()

        if is_opt_out:
            from app.tasks.handle_opt_out import handle_opt_out_task
            from app.models.client import Client

            # Require a full 10-digit number before matching, and bound the
            # query. Note: a shared inbound Twilio number means a phone could
            # legitimately exist for several orgs; each real opt-out should stop
            # its own tenant's reminders. Per-org sender numbers would isolate
            # this fully — tracked as a known design gap.
            clients = []
            if from_number and len(from_number) >= 10:
                clients = (
                    db.query(Client)
                    .filter(Client.phone.contains(from_number[-10:]))
                    .limit(200)
                    .all()
                )
            seen = set()
            for c in clients:
                key = (c.id, c.org_id)
                if key in seen:
                    continue
                seen.add(key)
                try:
                    handle_opt_out_task.delay("whatsapp", from_number, c.org_id, "whatsapp_stop")
                except Exception:
                    handle_opt_out_task("whatsapp", from_number, c.org_id, "whatsapp_stop")
        elif message_sid:
            # log reply as notification message update
            msg = db.query(Message).filter(Message.provider_message_id == message_sid).first()
            if msg:
                msg.status = "replied"

    db.commit()
    return {"status": "ok"}

from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter, Depends, Request, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.message import Message
from app.models.invoice import Invoice
from app.models.suppression import Suppression
from app.models.audit_log import AuditLog
from app.services.email import apply_resend_event_to_message, decode_unsubscribe_token
from app.services.payment_detect import auto_stop_on_payment, detect_and_stop_if_paid

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.post("/resend")
async def resend_webhook(request: Request, db: Session = Depends(get_db)):
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
    payload = await request.json()
    # Accept flexible payloads: {invoice_id} or {external_id} or notifications list
    invoice_ids = []
    if payload.get("invoice_id"):
        invoice_ids.append(payload["invoice_id"])
    if payload.get("external_id"):
        inv = db.query(Invoice).filter(Invoice.external_id == str(payload["external_id"])).first()
        if inv:
            invoice_ids.append(inv.id)
    for note in payload.get("eventNotifications", []) or []:
        for entity in (note.get("dataChangeEvent") or {}).get("entities", []) or []:
            if entity.get("name") == "Invoice" and entity.get("id"):
                inv = db.query(Invoice).filter(Invoice.external_id == str(entity["id"])).first()
                if inv:
                    invoice_ids.append(inv.id)

    results = []
    for iid in set(invoice_ids):
        inv = db.query(Invoice).filter(Invoice.id == iid).first()
        if not inv:
            continue
        # If webhook says paid / balance 0
        if payload.get("balance") is not None:
            inv.balance = float(payload["balance"])
        if payload.get("status") == "paid" or float(inv.balance or 0) <= 0:
            results.append(auto_stop_on_payment(db, inv, method="quickbooks_webhook"))
        else:
            try:
                from app.tasks.payment_detect import payment_detect_invoice_task

                payment_detect_invoice_task.delay(inv.id)
            except Exception:
                detect_and_stop_if_paid(db, inv, method="quickbooks_webhook")
    db.commit()
    return {"status": "ok", "processed": len(results), "results": results}


@router.post("/freshbooks")
async def freshbooks_webhook(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()
    invoice_ids = []
    if payload.get("invoice_id"):
        invoice_ids.append(payload["invoice_id"])
    ext = payload.get("object_id") or payload.get("external_id")
    if ext:
        inv = db.query(Invoice).filter(Invoice.external_id == str(ext)).first()
        if inv:
            invoice_ids.append(inv.id)

    results = []
    for iid in set(invoice_ids):
        inv = db.query(Invoice).filter(Invoice.id == iid).first()
        if not inv:
            continue
        if payload.get("balance") is not None:
            inv.balance = float(payload["balance"])
        if payload.get("status") in ("paid", "received") or float(inv.balance or 0) <= 0:
            results.append(auto_stop_on_payment(db, inv, method="freshbooks_webhook"))
        else:
            try:
                from app.tasks.payment_detect import payment_detect_invoice_task

                payment_detect_invoice_task.delay(inv.id)
            except Exception:
                detect_and_stop_if_paid(db, inv, method="freshbooks_webhook")
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
            sub.status = "active"
            sub.cancel_at_period_end = False
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
            db.add(
                WhatsAppCredit(
                    org_id=org.id,
                    paddle_transaction_id=data.get("id"),
                    amount_paid=15.0,
                    credits_added=int(custom.get("credits") or 500),
                    credits_used=0,
                    status="active",
                )
            )

    db.commit()
    return {"status": "ok", "event": event_type}


@router.post("/twilio")
async def twilio_webhook(request: Request, db: Session = Depends(get_db)):
    form = dict(await request.form())
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
        if upper in ("STOP", "UNSUBSCRIBE", "CANCEL"):
            from app.tasks.handle_opt_out import handle_opt_out_task
            from app.models.client import Client

            clients = db.query(Client).filter(Client.phone.contains(from_number[-10:])).all() if from_number else []
            for c in clients:
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

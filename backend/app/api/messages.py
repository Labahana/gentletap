from datetime import datetime, timezone, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.message import Message
from app.models.invoice import Invoice
from app.models.client import Client
from app.models.audit_log import AuditLog
from app.schemas.message import ManualSendRequest, MessageOut
from app.services.email import render_template_placeholders, send_email_dispatch, send_email_via_resend

router = APIRouter(prefix="/messages", tags=["Messages"])


@router.get("/aggregate")
def messages_aggregate(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    query = db.query(Message).filter(Message.org_id == org.id)
    if date_from:
        query = query.filter(Message.created_at >= date_from)
    if date_to:
        query = query.filter(Message.created_at <= date_to)

    rows = query.all()
    return {
        "sent": sum(1 for m in rows if m.status in ("sent", "delivered", "opened", "clicked")),
        "delivered": sum(1 for m in rows if m.status in ("delivered", "opened", "clicked") or m.delivered_at),
        "opened": sum(1 for m in rows if m.opened_at or m.status == "opened"),
        "clicked": sum(1 for m in rows if m.clicked_at or m.status == "clicked"),
        "replied": 0,
        "failed": sum(1 for m in rows if m.status in ("failed", "bounced")),
        "total": len(rows),
    }


@router.get("", response_model=List[MessageOut])
def list_messages(
    invoice_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    query = db.query(Message, Client.name.label("client_name"), Invoice.number.label("invoice_number"))\
        .join(Client, Message.client_id == Client.id)\
        .join(Invoice, Message.invoice_id == Invoice.id)\
        .filter(Message.org_id == org.id)

    if invoice_id:
        query = query.filter(Message.invoice_id == invoice_id)

    if status and status.lower() != "all":
        query = query.filter(Message.status == status.lower())

    if q:
        query = query.filter(
            or_(
                Message.subject.ilike(f"%{q}%"),
                Client.name.ilike(f"%{q}%"),
                Client.email.ilike(f"%{q}%"),
                Invoice.number.ilike(f"%{q}%"),
            )
        )

    query = query.order_by(Message.created_at.desc())
    offset = (page - 1) * page_size
    results = query.offset(offset).limit(page_size).all()

    output = []
    for msg, c_name, inv_num in results:
        msg_dict = MessageOut.model_validate(msg)
        msg_dict.client_name = c_name
        msg_dict.invoice_number = inv_num
        output.append(msg_dict)

    return output


@router.get("/{id}", response_model=MessageOut)
def get_message_detail(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    res = db.query(Message, Client.name.label("client_name"), Invoice.number.label("invoice_number"))\
        .join(Client, Message.client_id == Client.id)\
        .join(Invoice, Message.invoice_id == Invoice.id)\
        .filter(Message.id == id, Message.org_id == org.id)\
        .first()

    if not res:
        raise HTTPException(status_code=404, detail="Message not found")

    msg, c_name, inv_num = res
    output = MessageOut.model_validate(msg)
    output.client_name = c_name
    output.invoice_number = inv_num
    return output


@router.post("/send", response_model=MessageOut)
def manual_send_message(
    req: ManualSendRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org

    # 1. Fetch invoice & client
    invoice = db.query(Invoice).filter(Invoice.id == req.invoice_id, Invoice.org_id == org.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    # Hard Requirement: Never send a reminder after an invoice is marked paid or closed
    if invoice.status in ("paid", "closed"):
        raise HTTPException(status_code=400, detail="Cannot send reminders for paid or closed invoices")

    from app.services.plan_gating import require_feature

    if not req.preview:
        require_feature(org, "collection")

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    if not client or not client.email:
        raise HTTPException(status_code=400, detail="Client has no email address configured")

    # Hard Requirement: Never send duplicate manual sends (check last sent time within 60s)
    now = datetime.now(timezone.utc)
    recent = db.query(Message).filter(
        Message.invoice_id == invoice.id,
        Message.created_at >= now - timedelta(seconds=60),
    ).first()
    if recent and not req.preview:
        raise HTTPException(status_code=429, detail="A reminder was sent less than a minute ago. Duplicate send blocked.")

    # Calculate days overdue
    days_overdue = 0
    if invoice.due_date:
        delta = datetime.now().date() - invoice.due_date
        days_overdue = max(0, delta.days)

    context = {
        "client_name": client.name,
        "invoice_number": invoice.number,
        "amount": invoice.amount,
        "due_date": invoice.due_date.isoformat() if invoice.due_date else "due date",
        "days_overdue": days_overdue,
    }

    rendered_subject = render_template_placeholders(req.subject, context)
    rendered_body = render_template_placeholders(req.body, context)

    if req.preview:
        # Return transient preview message without dispatching email or creating audit log
        temp_msg = Message(
            id="preview_temp_id",
            org_id=org.id,
            invoice_id=invoice.id,
            client_id=client.id,
            template_id=req.template_id,
            channel="email",
            subject=rendered_subject,
            body=rendered_body,
            status="queued",
            created_at=now,
        )
        output = MessageOut.model_validate(temp_msg)
        output.client_name = client.name
        output.invoice_number = invoice.number
        return output

    # Dual Dispatch (Gmail OAuth or Resend domain)
    send_via = req.send_via or "resend"
    dispatch_res = send_email_dispatch(
        org_id=org.id,
        to_email=client.email,
        subject=rendered_subject,
        body=rendered_body,
        send_via=send_via,
        db=db,
    )

    msg = Message(
        org_id=org.id,
        invoice_id=invoice.id,
        client_id=client.id,
        template_id=req.template_id,
        channel="email",
        subject=rendered_subject,
        body=rendered_body,
        status="sent",
        provider_message_id=dispatch_res.get("id"),
        sent_at=now,
    )
    db.add(msg)

    # Count toward collection quota
    org.collections_used_this_period = (org.collections_used_this_period or 0) + 1

    # Audit log entry
    audit = AuditLog(
        org_id=org.id,
        actor_type="user",
        actor_id=user.id,
        action="manual_send_reminder",
        entity_type="message",
        entity_id=msg.id,
        details={
            "invoice_id": invoice.id,
            "invoice_number": invoice.number,
            "client_email": client.email,
            "subject": rendered_subject,
            "send_via": send_via,
            "provider": dispatch_res.get("provider", "resend"),
        },
    )
    db.add(audit)

    db.commit()
    db.refresh(msg)

    output = MessageOut.model_validate(msg)
    output.client_name = client.name
    output.invoice_number = invoice.number
    return output


@router.post("/{id}/resend", response_model=MessageOut)
def resend_message(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    original_msg = db.query(Message).filter(Message.id == id, Message.org_id == org.id).first()
    if not original_msg:
        raise HTTPException(status_code=404, detail="Message not found")

    invoice = db.query(Invoice).filter(Invoice.id == original_msg.invoice_id).first()
    if not invoice or invoice.status in ("paid", "closed"):
        raise HTTPException(status_code=400, detail="Invoice is paid or closed")

    client = db.query(Client).filter(Client.id == original_msg.client_id).first()
    if not client or not client.email:
        raise HTTPException(status_code=400, detail="Client email not found")

    dispatch_res = send_email_dispatch(
        org_id=org.id,
        to_email=client.email,
        subject=original_msg.subject,
        body=original_msg.body,
        send_via="resend",
        db=db,
    )

    now = datetime.now(timezone.utc)
    new_msg = Message(
        org_id=org.id,
        invoice_id=invoice.id,
        client_id=client.id,
        template_id=original_msg.template_id,
        channel="email",
        subject=original_msg.subject,
        body=original_msg.body,
        status="sent",
        provider_message_id=dispatch_res.get("id"),
        sent_at=now,
    )
    db.add(new_msg)

    db.commit()
    db.refresh(new_msg)

    output = MessageOut.model_validate(new_msg)
    output.client_name = client.name
    output.invoice_number = invoice.number
    return output

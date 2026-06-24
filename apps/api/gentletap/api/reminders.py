from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from gentletap.database import Invoice, ReminderMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.rate_limit import limiter
from gentletap.services.email_router import has_delivery_capability
from gentletap.services.reminders import preview_overdue_invoices
from gentletap.services.activation_status import get_activation_status
from gentletap.tasks.activation import queue_activation

router = APIRouter(prefix="/reminders", tags=["reminders"])


class ReminderUpdate(BaseModel):
    subject: str | None = None
    body: str | None = None


@router.get("/preview")
@limiter.limit("20/minute")
def get_preview(request: Request, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    from sqlalchemy import func

    overdue_q = db.query(Invoice).filter(
        Invoice.user_id == user.id,
        Invoice.balance > 0,
        Invoice.days_overdue > 0,
    )
    stats_row = overdue_q.with_entities(
        func.count(Invoice.id),
        func.coalesce(func.sum(Invoice.balance), 0),
        func.coalesce(func.max(Invoice.days_overdue), 0),
        func.coalesce(func.avg(Invoice.days_overdue), 0),
    ).one()
    count, total, oldest, avg_days = stats_row
    items = preview_overdue_invoices(db, user.id)
    return {
        "items": items,
        "count": len(items),
        "summary": {
            "overdue_count": int(count or 0),
            "total_outstanding": float(total or 0),
            "oldest_days_overdue": int(oldest or 0),
            "avg_days_overdue": int(round(float(avg_days or 0))),
        },
    }


@router.put("/{reminder_id}")
def update_draft(
    reminder_id: UUID,
    body: ReminderUpdate,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    message = db.query(ReminderMessage).filter(ReminderMessage.id == reminder_id).one_or_none()
    if message is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    invoice = db.query(Invoice).filter(Invoice.id == message.invoice_id, Invoice.user_id == user.id).one_or_none()
    if invoice is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reminder not found")
    if message.channel == "whatsapp" and (body.subject is not None or body.body is not None):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="WhatsApp reminders use Meta-approved templates and cannot be edited",
        )
    if body.subject is not None:
        message.subject = body.subject
    if body.body is not None:
        message.body = body.body
    message.status = "pending_approval"
    db.commit()
    return {"id": str(message.id), "subject": message.subject, "body": message.body}


@router.get("/activate-status")
def activation_status(user: CurrentUser) -> dict:
    return get_activation_status(user.id)


@router.post("/approve-all", status_code=status.HTTP_202_ACCEPTED)
def approve_all(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if not has_delivery_capability(db, user.id, plan=user.plan):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect Gmail, verify an email sender, or connect WhatsApp before going live",
        )
    queue_activation(user.id)
    return {"status": "queued"}

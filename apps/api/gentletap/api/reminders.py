from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from gentletap.database import Invoice, ReminderMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.reminders import approve_all_overdue, preview_overdue_invoices

router = APIRouter(prefix="/reminders", tags=["reminders"])


class ReminderUpdate(BaseModel):
    subject: str | None = None
    body: str | None = None


@router.get("/preview")
def get_preview(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    items = preview_overdue_invoices(db, user.id)
    return {"items": items, "count": len(items)}


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


@router.post("/approve-all")
def approve_all(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    return approve_all_overdue(db, user)

"""Data & privacy controls: retention and per-client export."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, ReminderMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.automation_settings import get_automation_settings

router = APIRouter(prefix="/privacy", tags=["privacy"])


class RetentionBody(BaseModel):
    delete_paid_after_days: int | None = Field(default=None, ge=30, le=3650)


@router.get("/retention")
def read_retention(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    settings = get_automation_settings(db, user.id)
    return {"retention": {"delete_paid_after_days": settings.retention_days}}


@router.put("/retention")
def update_retention(body: RetentionBody, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    settings = get_automation_settings(db, user.id)
    settings.retention_days = body.delete_paid_after_days
    db.commit()
    return {"retention": {"delete_paid_after_days": settings.retention_days}}


@router.get("/clients/{client_id}/export")
def export_client(client_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> JSONResponse:
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.user_id == user.id)
        .one_or_none()
    )
    if client is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Client not found")

    invoices = db.query(Invoice).filter(Invoice.client_id == client.id, Invoice.user_id == user.id).all()
    messages = (
        db.query(ReminderMessage)
        .filter(ReminderMessage.invoice_id.in_([i.id for i in invoices] or [UUID(int=0)]))
        .all()
    )
    payload = {
        "client": {
            "id": str(client.id),
            "name": client.name,
            "email": client.email,
            "phone": client.phone,
            "do_not_contact": client.do_not_contact,
        },
        "invoices": [
            {
                "id": str(i.id),
                "doc_number": i.doc_number,
                "amount": float(i.amount),
                "balance": float(i.balance),
                "currency": i.currency,
                "due_date": i.due_date.isoformat() if isinstance(i.due_date, date) else None,
            }
            for i in invoices
        ],
        "reminders": [
            {
                "id": str(m.id),
                "invoice_id": str(m.invoice_id),
                "step": m.sequence_step,
                "channel": m.channel,
                "subject": m.subject,
                "body": m.body,
                "status": m.status,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
            }
            for m in messages
        ],
    }
    return JSONResponse(
        content=payload,
        headers={"Content-Disposition": f'attachment; filename="client-{client_id}-export.json"'},
    )


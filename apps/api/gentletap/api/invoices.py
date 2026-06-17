from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Invoice, ReminderMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.sequences import cancel_invoice_jobs, schedule_next_job

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("")
def list_invoices(
    user: CurrentUser,
    db: Session = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
) -> dict:
    q = db.query(Invoice).filter(Invoice.user_id == user.id)
    if status_filter:
        q = q.filter(Invoice.status == status_filter)
    total = q.count()
    rows = q.order_by(Invoice.days_overdue.desc(), Invoice.balance.desc()).offset(offset).limit(limit).all()
    return {
        "items": [
            {
                "id": str(inv.id),
                "doc_number": inv.doc_number,
                "client_name": inv.client.name if inv.client else "",
                "client_email": inv.client.email if inv.client else None,
                "amount": float(inv.amount),
                "balance": float(inv.balance),
                "currency": inv.currency,
                "days_overdue": inv.days_overdue,
                "status": inv.status,
                "sequence_active": inv.sequence_active,
                "sequence_paused": inv.sequence_paused,
                "sequence_step": inv.sequence_step,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
            }
            for inv in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/summary")
def invoices_summary(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    unpaid_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    overdue_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.days_overdue > 0)
        .scalar()
        or 0
    )
    green_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.status == "green")
        .scalar()
        or 0
    )
    yellow_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.status == "yellow")
        .scalar()
        or 0
    )
    red_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.status == "red")
        .scalar()
        or 0
    )
    active_sequences = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.sequence_active.is_(True))
        .scalar()
        or 0
    )
    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    currency_row = (
        db.query(Invoice.currency)
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .first()
    )

    return {
        "unpaid_count": unpaid_count,
        "overdue_count": overdue_count,
        "total_outstanding": float(total_outstanding),
        "currency": currency_row[0] if currency_row else "USD",
        "green_count": green_count,
        "yellow_count": yellow_count,
        "red_count": red_count,
        "active_sequences": active_sequences,
    }


@router.get("/{invoice_id}")
def invoice_detail(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    messages = (
        db.query(ReminderMessage)
        .filter(ReminderMessage.invoice_id == inv.id)
        .order_by(ReminderMessage.created_at.desc())
        .all()
    )
    return {
        "id": str(inv.id),
        "doc_number": inv.doc_number,
        "client": {
            "name": inv.client.name if inv.client else "",
            "email": inv.client.email if inv.client else None,
            "phone": inv.client.phone if inv.client else None,
        },
        "amount": float(inv.amount),
        "balance": float(inv.balance),
        "currency": inv.currency,
        "days_overdue": inv.days_overdue,
        "status": inv.status,
        "sequence_active": inv.sequence_active,
        "sequence_paused": inv.sequence_paused,
        "sequence_step": inv.sequence_step,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "reminders": [
            {
                "id": str(m.id),
                "sequence_step": m.sequence_step,
                "subject": m.subject,
                "body": m.body,
                "status": m.status,
                "sent_at": m.sent_at.isoformat() if m.sent_at else None,
                "tone": m.tone,
                "channel": m.channel,
            }
            for m in messages
        ],
    }


@router.post("/{invoice_id}/pause")
def pause_invoice(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    inv.sequence_paused = True
    cancel_invoice_jobs(db, inv.id)
    db.commit()
    return {"status": "paused"}


@router.post("/{invoice_id}/resume")
def resume_invoice(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    inv.sequence_paused = False
    if inv.sequence_active:
        schedule_next_job(db, inv, delay_days=0)
    db.commit()
    return {"status": "resumed"}


@router.post("/{invoice_id}/approve")
def approve_invoice(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    inv.sequence_approved = True
    inv.sequence_active = True
    schedule_next_job(db, inv, delay_days=0)
    db.commit()
    return {"status": "approved"}

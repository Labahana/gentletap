from uuid import UUID
from decimal import Decimal
import json

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Invoice, InvoiceImportBatch, ReminderMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.csv_import import import_invoices_from_file
from gentletap.services.dashboard_data import (
    build_activity_feed,
    build_summary_extras,
    enrich_invoice_row,
    last_sent_reminders_by_invoice,
)
from gentletap.services.invoice_source import (
    attention_reason_label,
    invoice_needs_attention,
    invoice_source,
    invoice_source_label,
    source_counts_for_user,
)
from gentletap.services.email_router import has_delivery_capability
from gentletap.services.manual_invoices import (
    bulk_mark_upload_invoices_paid,
    mark_upload_invoice_paid,
    update_upload_invoice,
)
from gentletap.services.reminder_contacts import (
    effective_reminder_email,
    effective_reminder_phone,
    reminder_contact_payload,
    update_invoice_contacts,
)
from gentletap.services.plan_limits import ensure_can_activate, free_plan_collection_usage, mark_collection_started
from gentletap.services.sequences import (
    cancel_invoice_jobs,
    schedule_next_job,
    scheduled_for_current_step,
)

router = APIRouter(prefix="/invoices", tags=["invoices"])


class InvoiceManualUpdateBody(BaseModel):
    balance: float | None = Field(default=None, ge=0)
    due_date: str | None = None
    payment_link: str | None = None
    clear_payment_link: bool = False


class InvoiceContactsBody(BaseModel):
    reminder_phone: str | None = None
    clear_reminder_phone: bool = False
    client_email: str | None = None


class BulkMarkPaidBody(BaseModel):
    invoice_ids: list[UUID] = Field(min_length=1, max_length=100)


@router.post("/import")
async def import_invoices_csv(
    user: CurrentUser,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
) -> dict:
    content = await file.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is empty")
    if len(content) > 5_000_000:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File is too large — max 5 MB")
    filename = file.filename or "upload.csv"
    try:
        return import_invoices_from_file(db, user.id, content, filename)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/import-history")
def import_history(
    user: CurrentUser,
    db: Session = Depends(get_db),
    limit: int = Query(10, le=50),
) -> dict:
    rows = (
        db.query(InvoiceImportBatch)
        .filter(InvoiceImportBatch.user_id == user.id)
        .order_by(InvoiceImportBatch.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "items": [
            {
                "id": str(row.id),
                "filename": row.filename,
                "imported_count": row.imported_count,
                "skipped_count": row.skipped_count,
                "total_outstanding": float(row.total_outstanding),
                "columns_found": json.loads(row.columns_found) if row.columns_found else [],
                "created_at": row.created_at.isoformat(),
            }
            for row in rows
        ]
    }


@router.post("/bulk-mark-paid")
def bulk_mark_invoices_paid(
    body: BulkMarkPaidBody,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    return bulk_mark_upload_invoices_paid(db, user.id, body.invoice_ids)


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
    last_by_inv = last_sent_reminders_by_invoice(db, [inv.id for inv in rows])
    return {
        "items": [
            enrich_invoice_row(inv, last_by_inv.get(inv.id))
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

    # Aging buckets by days_overdue
    def _bucket(min_days: int, max_days: int | None) -> dict:
        q = db.query(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.balance), 0),
        ).filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.days_overdue >= min_days)
        if max_days is not None:
            q = q.filter(Invoice.days_overdue <= max_days)
        row = q.first()
        return {"count": row[0] or 0, "total": float(row[1] or 0)}

    extras = build_summary_extras(db, user.id)
    overdue_stats = (
        db.query(
            func.coalesce(func.max(Invoice.days_overdue), 0),
            func.coalesce(func.avg(Invoice.days_overdue), 0),
        )
        .filter(Invoice.user_id == user.id, Invoice.balance > 0, Invoice.days_overdue > 0)
        .one()
    )
    return {
        "unpaid_count": unpaid_count,
        "overdue_count": overdue_count,
        "total_outstanding": float(total_outstanding),
        "oldest_days_overdue": int(overdue_stats[0] or 0),
        "avg_days_overdue": int(round(float(overdue_stats[1] or 0))),
        "currency": currency_row[0] if currency_row else "USD",
        "green_count": green_count,
        "yellow_count": yellow_count,
        "red_count": red_count,
        "active_sequences": active_sequences,
        "monthly_collections": free_plan_collection_usage(db, user),
        "aging": {
            "current": _bucket(0, 0),
            "days_1_30": _bucket(1, 30),
            "days_31_60": _bucket(31, 60),
            "days_61_90": _bucket(61, 90),
            "days_90_plus": _bucket(91, None),
        },
        **extras,
        "activity": build_activity_feed(db, user.id, limit=10),
        "sources": source_counts_for_user(db, user.id),
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
    source = invoice_source(inv)
    needs_attention, attention_reason = invoice_needs_attention(inv)
    contacts = reminder_contact_payload(inv)
    return {
        "id": str(inv.id),
        "doc_number": inv.doc_number,
        "source": source,
        "source_label": invoice_source_label(source),
        "needs_attention": needs_attention,
        "attention_reason": attention_reason,
        "attention_label": attention_reason_label(attention_reason),
        "client": {
            "id": str(inv.client.id) if inv.client else None,
            "name": inv.client.name if inv.client else "",
            "email": inv.client.email if inv.client else None,
            "phone": inv.client.phone if inv.client else None,
        },
        "reminder_email": effective_reminder_email(inv),
        **contacts,
        "amount": float(inv.amount),
        "balance": float(inv.balance),
        "currency": inv.currency,
        "days_overdue": inv.days_overdue,
        "status": inv.status,
        "sequence_active": inv.sequence_active,
        "sequence_paused": inv.sequence_paused,
        "sequence_step": inv.sequence_step,
        "dispute_flag": inv.dispute_flag,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "payment_link": inv.payment_link,
        "imported_at": inv.imported_at.isoformat() if inv.imported_at else None,
        "last_manual_update_at": inv.last_manual_update_at.isoformat() if inv.last_manual_update_at else None,
        "client_claimed_paid_at": inv.client_claimed_paid_at.isoformat() if inv.client_claimed_paid_at else None,
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
        schedule_next_job(db, inv, scheduled_for=scheduled_for_current_step(db, inv))
    db.commit()
    return {"status": "resumed"}


@router.post("/{invoice_id}/approve")
def approve_invoice(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if not has_delivery_capability(db, user.id, plan=user.plan):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect Gmail or verify an email sender before activating reminders",
        )
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    if not inv.sequence_active:
        ensure_can_activate(db, user, [inv])
        mark_collection_started(inv)
        inv.sequence_active = True
    inv.sequence_approved = True
    schedule_next_job(db, inv, scheduled_for=scheduled_for_current_step(db, inv))
    db.commit()
    return {"status": "approved"}


@router.post("/{invoice_id}/dispute")
def mark_dispute(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    inv.dispute_flag = True
    inv.sequence_paused = True
    cancel_invoice_jobs(db, inv.id)
    db.commit()
    return {"status": "disputed"}


@router.post("/{invoice_id}/clear-dispute")
def clear_dispute(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    inv.dispute_flag = False
    inv.sequence_paused = False
    if inv.sequence_active and float(inv.balance) > 0:
        schedule_next_job(db, inv, scheduled_for=scheduled_for_current_step(db, inv))
    db.commit()
    return {"status": "cleared"}


@router.post("/{invoice_id}/mark-paid")
def mark_invoice_paid_manual(invoice_id: UUID, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    mark_upload_invoice_paid(db, inv, user_id=user.id)
    return {"status": "paid", "balance": 0.0}


@router.patch("/{invoice_id}/contacts")
def update_invoice_contacts_endpoint(
    invoice_id: UUID,
    body: InvoiceContactsBody,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    inv = update_invoice_contacts(
        db,
        inv,
        reminder_phone=body.reminder_phone,
        clear_reminder_phone=body.clear_reminder_phone,
        client_email=body.client_email,
    )
    return {
        "status": "updated",
        "reminder_email": effective_reminder_email(inv),
        **reminder_contact_payload(inv),
        "client": {
            "email": inv.client.email if inv.client else None,
            "phone": inv.client.phone if inv.client else None,
        },
    }


@router.patch("/{invoice_id}")
def update_invoice_manual(
    invoice_id: UUID,
    body: InvoiceManualUpdateBody,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    inv = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user.id)
        .one_or_none()
    )
    if inv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    due = None
    if body.due_date is not None:
        try:
            from datetime import date

            due = date.fromisoformat(body.due_date)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid due_date") from exc

    balance = Decimal(str(body.balance)) if body.balance is not None else None
    inv = update_upload_invoice(
        db,
        inv,
        balance=balance,
        due_date=due,
        payment_link=body.payment_link,
        clear_payment_link=body.clear_payment_link,
    )
    return {
        "status": "updated",
        "balance": float(inv.balance),
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "payment_link": inv.payment_link,
    }

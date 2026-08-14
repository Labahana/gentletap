from uuid import UUID
from decimal import Decimal
import json

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response
from pydantic import BaseModel, Field
from sqlalchemy import func, tuple_
from sqlalchemy.orm import Session

from gentletap.database import Invoice, InvoiceImportBatch, ReminderMessage, get_db
from gentletap.dependencies import CurrentUser
from gentletap.plans import has_whatsapp
from gentletap.services.csv_import import build_import_sample_file, import_invoices_from_file
from gentletap.services.dashboard_cache import get_invoices_summary_cached, invalidate_dashboard_summary
from gentletap.services.dashboard_data import (
    enrich_invoice_row,
    last_sent_reminders_by_invoice,
)
from gentletap.utils.pagination import decode_invoice_cursor, encode_invoice_cursor
from gentletap.services.invoice_source import (
    attention_reason_label,
    invoice_needs_attention,
    invoice_source,
    invoice_source_label,
)
from gentletap.services.manual_invoices import (
    bulk_mark_upload_invoices_paid,
    create_manual_invoice,
    mark_upload_invoice_paid,
    update_upload_invoice,
)
from gentletap.services.reminder_contacts import (
    effective_reminder_email,
    reminder_contact_payload,
    update_invoice_contacts,
)
from gentletap.services.email_router import has_delivery_capability
from gentletap.services.plan_limits import ensure_can_activate, mark_collection_started
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
    expected_payment_date: str | None = None
    clear_expected_payment_date: bool = False


class BulkMarkPaidBody(BaseModel):
    invoice_ids: list[UUID] = Field(min_length=1, max_length=100)


class CreateInvoiceBody(BaseModel):
    client_name: str
    client_email: str
    amount: float = Field(gt=0)
    due_date: str
    client_phone: str | None = None
    doc_number: str | None = None
    currency: str = "USD"
    invoice_date: str | None = None
    payment_link: str | None = None


@router.post("", status_code=status.HTTP_201_CREATED)
def create_invoice(
    body: CreateInvoiceBody,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    """Create a single invoice manually (no accounting software / CSV)."""
    from gentletap.integrations.quickbooks.sync import _parse_date
    from gentletap.services.reminders import auto_activate_new_invoices

    due = _parse_date(body.due_date)
    if due is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid due_date")
    inv = create_manual_invoice(
        db,
        user.id,
        client_name=body.client_name,
        client_email=body.client_email,
        amount=Decimal(str(body.amount)),
        due_date=due,
        client_phone=body.client_phone,
        doc_number=body.doc_number,
        currency=body.currency,
        invoice_date=_parse_date(body.invoice_date) if body.invoice_date else None,
        payment_link=body.payment_link,
    )
    # After go-live with autopilot on, start chasing overdue invoices immediately.
    if user.onboarding_step == "live":
        auto_activate_new_invoices(db, user)
        db.refresh(inv)
    invalidate_dashboard_summary(user.id)
    return {"id": str(inv.id), "invoice": enrich_invoice_row(inv, None)}


@router.get("/import-sample")
def download_import_sample(
    format: str = Query("csv", alias="format", pattern="^(csv|xlsx)$"),
) -> Response:
    """Download a sample invoice spreadsheet (CSV or Excel). Public — no auth required."""
    try:
        content, filename, media_type = build_import_sample_file(format)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return Response(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


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
        result = import_invoices_from_file(db, user.id, content, filename)
        invalidate_dashboard_summary(user.id)
        return result
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
    result = bulk_mark_upload_invoices_paid(db, user.id, body.invoice_ids)
    invalidate_dashboard_summary(user.id)
    return result


@router.get("")
def list_invoices(
    user: CurrentUser,
    db: Session = Depends(get_db),
    status_filter: str | None = Query(None, alias="status"),
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    cursor: str | None = Query(None),
) -> dict:
    q = db.query(Invoice).filter(Invoice.user_id == user.id)
    if status_filter:
        q = q.filter(Invoice.status == status_filter)

    if offset > 0 and cursor is None:
        total = q.count()
        rows = q.order_by(Invoice.days_overdue.desc(), Invoice.balance.desc()).offset(offset).limit(limit).all()
        last_by_inv = last_sent_reminders_by_invoice(db, [inv.id for inv in rows])
        return {
            "items": [enrich_invoice_row(inv, last_by_inv.get(inv.id)) for inv in rows],
            "total": total,
            "limit": limit,
            "offset": offset,
            "next_cursor": None,
        }

    if cursor:
            days_overdue, balance, invoice_id = decode_invoice_cursor(cursor)
            q = q.filter(
                tuple_(Invoice.days_overdue, Invoice.balance, Invoice.id)
                < tuple_(days_overdue, balance, invoice_id)
            )
    rows = (
            q.order_by(Invoice.days_overdue.desc(), Invoice.balance.desc(), Invoice.id.desc())
            .limit(limit + 1)
            .all()
    )
    has_more = len(rows) > limit
    if has_more:
        rows = rows[:limit]
    last_by_inv = last_sent_reminders_by_invoice(db, [inv.id for inv in rows])
    next_cursor = encode_invoice_cursor(rows[-1]) if has_more and rows else None
    total = None
    if not cursor:
        count_q = db.query(func.count(Invoice.id)).filter(Invoice.user_id == user.id)
        if status_filter:
            count_q = count_q.filter(Invoice.status == status_filter)
        total = count_q.scalar()
    return {
        "items": [enrich_invoice_row(inv, last_by_inv.get(inv.id)) for inv in rows],
        "total": total,
        "limit": limit,
        "offset": offset,
        "next_cursor": next_cursor,
    }


@router.get("/summary")
def invoices_summary(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    return get_invoices_summary_cached(db, user.id)


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
    invalidate_dashboard_summary(user.id)
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
    invalidate_dashboard_summary(user.id)
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

    if (body.reminder_phone is not None or body.clear_reminder_phone) and not has_whatsapp(user.plan):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="WhatsApp is available on Pro+ and Team plans only",
        )

    inv = update_invoice_contacts(
        db,
        inv,
        reminder_phone=body.reminder_phone,
        clear_reminder_phone=body.clear_reminder_phone,
        client_email=body.client_email,
    )

    if body.clear_expected_payment_date:
        inv.expected_payment_date = None
    elif body.expected_payment_date is not None:
        from gentletap.integrations.quickbooks.sync import _parse_date

        parsed = _parse_date(body.expected_payment_date)
        if parsed is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid expected_payment_date")
        inv.expected_payment_date = parsed

    db.commit()
    return {
        "status": "updated",
        "reminder_email": effective_reminder_email(inv),
        **reminder_contact_payload(inv),
        "expected_payment_date": inv.expected_payment_date.isoformat() if inv.expected_payment_date else None,
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

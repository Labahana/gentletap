from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from fastapi.responses import Response
from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.invoice import Invoice
from app.models.client import Client
from app.models.payout import Payout
from app.models.audit_log import AuditLog
from app.models.sequence import SequenceAssignment
from app.schemas.invoice import (
    InvoiceCreate,
    InvoiceUpdate,
    InvoiceOut,
    CSVImportPreviewResponse,
    CSVConfirmImportRequest,
)
from app.services.csv_import import parse_and_preview_csv, execute_csv_import

router = APIRouter(prefix="/invoices", tags=["Invoices"])

from app.services.plan_gating import normalize_plan


def _clean_payment_link(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    link = value.strip()
    if not link:
        return None
    if not link.lower().startswith(("http://", "https://")):
        raise HTTPException(status_code=422, detail="payment_link must be a valid http(s) URL")
    return link[:2048]


def _clean_reminder_phone(value: Optional[str]) -> Optional[str]:
    """Normalize a per-invoice WhatsApp override to E.164; reject un-normalizable input."""
    if value is None:
        return None
    raw = value.strip()
    if not raw:
        return None
    from app.services.reminder_contacts import normalize_phone_e164

    normalized = normalize_phone_e164(raw)
    if normalized is None:
        raise HTTPException(
            status_code=422,
            detail="reminder_phone must be a valid phone number in international format (e.g. +15551234567)",
        )
    return normalized

SAMPLE_IMPORT_CSV = (
    "client_name,client_email,client_phone,invoice_number,amount,currency,due_date,invoice_date,payment_link\n"
    "Acme Corp,billing@acmecorp.com,+15550192834,INV-1001,2450.00,USD,2026-08-04,2026-07-04,https://pay.stripe.com/acme/inv-1001\n"
    "Starlight Design Studio,accounts@starlightdesign.io,,INV-1002,3800.00,USD,2026-08-21,2026-07-21,\n"
    "Bluepeak Media,finance@bluepeak.io,+15550148877,INV-1003,950.00,USD,2026-09-01,2026-08-01,https://pay.acme.com/bluepeak/inv-1003\n"
)


@router.get("/import-sample")
def download_import_sample():
    """Public sample CSV so users can see the expected import format."""
    return Response(
        content=SAMPLE_IMPORT_CSV,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=gentletap-import-sample.csv"},
    )


@router.get("", response_model=List[InvoiceOut])
def list_invoices(
    status: Optional[str] = Query(None),
    client_id: Optional[str] = Query(None),
    q: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    query = db.query(Invoice).filter(Invoice.org_id == org.id)

    if status and status != "all":
        query = query.filter(Invoice.status == status)

    if client_id:
        query = query.filter(Invoice.client_id == client_id)

    if q:
        query = query.join(Client).filter(
            or_(
                Invoice.number.ilike(f"%{q}%"),
                Client.name.ilike(f"%{q}%"),
                Client.email.ilike(f"%{q}%"),
            )
        )

    query = query.order_by(Invoice.created_at.desc())
    offset = (page - 1) * page_size
    return query.offset(offset).limit(page_size).all()


@router.get("/{id}", response_model=InvoiceOut)
def get_invoice_detail(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = db.query(Invoice).filter(Invoice.id == id, Invoice.org_id == org.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.post("", response_model=InvoiceOut)
def create_invoice(
    req: InvoiceCreate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org

    # Enforce free-plan invoice cap (aligned with the monthly collections quota)
    if normalize_plan(org.plan) == "starter":
        limit = org.collections_quota or 5
        current_count = db.query(Invoice).filter(Invoice.org_id == org.id).count()
        if current_count >= limit:
            raise HTTPException(
                status_code=403,
                detail=f"Starter plan limit of {limit} invoices reached. Please upgrade to unlock unlimited invoices.",
            )

    client = db.query(Client).filter(Client.id == req.client_id, Client.org_id == org.id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Invalid client ID")

    reminder_phone = _clean_reminder_phone(req.reminder_phone)
    # Backfill the client's default phone so future invoices from this contact
    # inherit WhatsApp without re-entry (hybrid contact model).
    if reminder_phone and not client.phone:
        client.phone = reminder_phone

    invoice = Invoice(
        org_id=org.id,
        number=req.number,
        client_id=client.id,
        amount=req.amount,
        balance=req.amount,
        currency=req.currency,
        due_date=req.due_date,
        issue_date=req.issue_date,
        status="unpaid",
        imported_from="manual",
        payment_link=_clean_payment_link(req.payment_link),
        reminder_phone=reminder_phone,
    )
    db.add(invoice)

    # Audit log
    audit = AuditLog(
        org_id=org.id,
        actor_type="user",
        actor_id=user.id,
        action="create_invoice",
        entity_type="invoice",
        entity_id=invoice.id,
        details={"number": req.number, "amount": req.amount},
    )
    db.add(audit)

    db.commit()
    db.refresh(invoice)

    # Autopilot chases manual invoices too — schedule immediately so the org sees
    # activity without waiting for the 5-minute reconciler backstop.
    from app.services.reminder_engine import autopilot_assign_if_enabled

    if autopilot_assign_if_enabled(db, invoice):
        db.commit()
        db.refresh(invoice)
    return invoice


MAX_CSV_BYTES = 5 * 1024 * 1024  # 5 MB upload cap
MAX_IMPORT_ROWS = 5000


@router.post("/import", response_model=CSVImportPreviewResponse)
async def upload_csv_import(
    file: UploadFile = File(...),
    user_and_org=Depends(get_current_user_and_org),
):
    filename = (file.filename or "").lower()
    if not filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are accepted")
    contents = await file.read()
    if len(contents) > MAX_CSV_BYTES:
        raise HTTPException(status_code=413, detail="CSV too large (max 5 MB)")
    preview = parse_and_preview_csv(contents)
    return preview


@router.post("/confirm-import")
def confirm_csv_import(
    req: CSVConfirmImportRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    if len(req.rows) > MAX_IMPORT_ROWS:
        raise HTTPException(status_code=400, detail=f"Too many rows (max {MAX_IMPORT_ROWS})")
    count = execute_csv_import(db, org.id, req.rows)
    return {"message": f"Successfully imported {count} invoices", "imported_count": count}


@router.patch("/{id}", response_model=InvoiceOut)
def update_invoice(
    id: str,
    req: InvoiceUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = db.query(Invoice).filter(Invoice.id == id, Invoice.org_id == org.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    if req.number is not None: invoice.number = req.number
    if req.amount is not None: invoice.amount = req.amount
    if req.balance is not None: invoice.balance = req.balance
    if req.currency is not None: invoice.currency = req.currency
    if req.due_date is not None: invoice.due_date = req.due_date
    if req.issue_date is not None: invoice.issue_date = req.issue_date
    if req.status is not None: invoice.status = req.status
    if req.expected_payment_date is not None: invoice.expected_payment_date = req.expected_payment_date
    if req.payment_link is not None: invoice.payment_link = _clean_payment_link(req.payment_link)
    if req.reminder_phone is not None: invoice.reminder_phone = _clean_reminder_phone(req.reminder_phone)

    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{id}/mark-paid", response_model=InvoiceOut)
def mark_invoice_paid(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    invoice = db.query(Invoice).filter(Invoice.id == id, Invoice.org_id == org.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    from app.services.payment_detect import auto_stop_on_payment

    auto_stop_on_payment(
        db,
        invoice,
        method="manual",
        actor_type="user",
        actor_id=user.id,
    )
    db.commit()
    db.refresh(invoice)
    return invoice


@router.post("/{id}/mark-disputed", response_model=InvoiceOut)
def mark_invoice_disputed(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = db.query(Invoice).filter(Invoice.id == id, Invoice.org_id == org.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    invoice.status = "disputed"
    invoice.stop_reminders = True
    from app.services.reminder_engine import cancel_pending_reminders
    from app.services.client_profile import recompute_client_profile

    cancel_pending_reminders(db, invoice.id, reason="disputed")
    recompute_client_profile(db, invoice.client_id, org.id)
    db.commit()
    db.refresh(invoice)
    return invoice

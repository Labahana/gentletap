from datetime import datetime, timezone
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
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

FREE_PLAN_INVOICE_LIMIT = 3


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

    # Enforce Free Plan 3-invoice limit
    if normalize_plan(org.plan) == "starter":
        current_count = db.query(Invoice).filter(Invoice.org_id == org.id).count()
        if current_count >= FREE_PLAN_INVOICE_LIMIT:
            raise HTTPException(
                status_code=403,
                detail=f"Starter plan limit of {FREE_PLAN_INVOICE_LIMIT} invoices reached. Please upgrade to unlock unlimited invoices.",
            )

    client = db.query(Client).filter(Client.id == req.client_id, Client.org_id == org.id).first()
    if not client:
        raise HTTPException(status_code=400, detail="Invalid client ID")

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
    return invoice


@router.post("/import", response_model=CSVImportPreviewResponse)
async def upload_csv_import(
    file: UploadFile = File(...),
    user_and_org=Depends(get_current_user_and_org),
):
    contents = await file.read()
    preview = parse_and_preview_csv(contents)
    return preview


@router.post("/confirm-import")
def confirm_csv_import(
    req: CSVConfirmImportRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
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

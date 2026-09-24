"""Approval queue: drafts parked by approval_mode awaiting a human decision."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.audit_log import AuditLog
from app.models.client import Client
from app.models.invoice import Invoice
from app.models.reminder_schedule import ReminderSchedule
from app.schemas.reminder import ApprovalDecisionIn, ApprovalQueueItemOut
from app.services.reminder_engine import next_valid_send_time, sync_reminder_job

router = APIRouter(prefix="/approval-queue", tags=["Approvals"])


def _get_queue_row(db: Session, row_id: str, org_id: str) -> ReminderSchedule:
    row = (
        db.query(ReminderSchedule)
        .filter(ReminderSchedule.id == row_id, ReminderSchedule.org_id == org_id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Approval item not found")
    return row


@router.get("", response_model=list[ApprovalQueueItemOut])
def list_approval_queue(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    rows = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.org_id == org.id,
            ReminderSchedule.status == "awaiting_approval",
        )
        .order_by(ReminderSchedule.created_at.asc())
        .all()
    )
    invoice_ids = {r.invoice_id for r in rows}
    invoices = (
        db.query(Invoice).filter(Invoice.id.in_(invoice_ids)).all() if invoice_ids else []
    )
    invoice_by_id = {i.id: i for i in invoices}
    client_ids = {i.client_id for i in invoices}
    clients = db.query(Client).filter(Client.id.in_(client_ids)).all() if client_ids else []
    client_by_id = {c.id: c for c in clients}

    items = []
    for row in rows:
        inv = invoice_by_id.get(row.invoice_id)
        client = client_by_id.get(inv.client_id) if inv else None
        items.append(
            ApprovalQueueItemOut(
                id=row.id,
                invoice_id=row.invoice_id,
                step_index=row.step_index,
                tone=row.tone,
                scheduled_at=row.scheduled_at,
                draft_subject=row.draft_subject,
                draft_body=row.draft_body,
                skip_reason=row.skip_reason,
                created_at=row.created_at,
                invoice_number=inv.number if inv else None,
                amount=float(inv.amount) if inv else None,
                currency=inv.currency if inv else None,
                due_date=inv.due_date if inv else None,
                client_name=client.name if client else None,
                client_email=client.email if client else None,
            )
        )
    return items


@router.post("/{row_id}/approve", response_model=ApprovalQueueItemOut)
def approve_queued_reminder(
    row_id: str,
    req: ApprovalDecisionIn,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    row = _get_queue_row(db, row_id, org.id)
    if row.status != "awaiting_approval":
        raise HTTPException(status_code=400, detail="Item is not awaiting approval")

    if req.subject is not None:
        row.draft_subject = req.subject[:500]
    if req.body is not None:
        row.draft_body = req.body

    # Send soon, but respect the contact window so an approval at 3am doesn't
    # fire immediately. approved_at marks the row so the autonomy gate lets it
    # through on the next dispatch.
    send_at = next_valid_send_time(
        datetime.now(timezone.utc) + timedelta(minutes=1),
        best_send_hour=None,
        enabled=True,
    )
    row.status = "pending"
    row.scheduled_at = send_at
    row.skip_reason = None
    row.approved_at = datetime.now(timezone.utc)

    invoice = db.query(Invoice).filter(Invoice.id == row.invoice_id).first()
    if invoice is not None:
        sync_reminder_job(db, invoice, None, row.step_index, send_at)

    db.add(
        AuditLog(
            org_id=org.id,
            actor_type="user",
            actor_id=user.id,
            action="reminder_approved",
            entity_type="invoice",
            entity_id=row.invoice_id,
            details={"schedule_id": row.id, "step": row.step_index, "edited": req.body is not None},
        )
    )
    db.commit()

    inv = db.query(Invoice).filter(Invoice.id == row.invoice_id).first()
    client = db.query(Client).filter(Client.id == inv.client_id).first() if inv else None
    return ApprovalQueueItemOut(
        id=row.id,
        invoice_id=row.invoice_id,
        step_index=row.step_index,
        tone=row.tone,
        scheduled_at=row.scheduled_at,
        draft_subject=row.draft_subject,
        draft_body=row.draft_body,
        skip_reason=row.skip_reason,
        created_at=row.created_at,
        invoice_number=inv.number if inv else None,
        amount=float(inv.amount) if inv else None,
        currency=inv.currency if inv else None,
        due_date=inv.due_date if inv else None,
        client_name=client.name if client else None,
        client_email=client.email if client else None,
    )


@router.post("/{row_id}/reject", response_model=ApprovalQueueItemOut)
def reject_queued_reminder(
    row_id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    row = _get_queue_row(db, row_id, org.id)
    if row.status != "awaiting_approval":
        raise HTTPException(status_code=400, detail="Item is not awaiting approval")

    row.status = "cancelled"
    row.skip_reason = "approval_rejected"
    db.add(
        AuditLog(
            org_id=org.id,
            actor_type="user",
            actor_id=user.id,
            action="reminder_rejected",
            entity_type="invoice",
            entity_id=row.invoice_id,
            details={"schedule_id": row.id, "step": row.step_index},
        )
    )
    db.commit()

    inv = db.query(Invoice).filter(Invoice.id == row.invoice_id).first()
    client = db.query(Client).filter(Client.id == inv.client_id).first() if inv else None
    return ApprovalQueueItemOut(
        id=row.id,
        invoice_id=row.invoice_id,
        step_index=row.step_index,
        tone=row.tone,
        scheduled_at=row.scheduled_at,
        draft_subject=row.draft_subject,
        draft_body=row.draft_body,
        skip_reason=row.skip_reason,
        created_at=row.created_at,
        invoice_number=inv.number if inv else None,
        amount=float(inv.amount) if inv else None,
        currency=inv.currency if inv else None,
        due_date=inv.due_date if inv else None,
        client_name=client.name if client else None,
        client_email=client.email if client else None,
    )

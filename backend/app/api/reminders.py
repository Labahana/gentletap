"""Reminder schedule APIs for invoices."""

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.invoice import Invoice
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence, SequenceAssignment
from app.schemas.reminder import (
    ReminderScheduleOut,
    ReminderScheduleUpdate,
    ScheduleTimelineOut,
    DraftRegenerateOut,
)
from app.services.reminder_engine import pause_pending_reminders, resume_pending_reminders
from app.tasks.draft_message import draft_reminder_content
from app.tasks.process_reminders import process_single_reminder
from app.tasks.send_email import create_and_send_message

router = APIRouter(prefix="/invoices", tags=["Reminders"])


def _get_invoice(db, invoice_id: str, org_id: str) -> Invoice:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id, Invoice.org_id == org_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice


@router.get("/{id}/schedule", response_model=ScheduleTimelineOut)
def get_invoice_schedule(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = _get_invoice(db, id, org.id)
    items = (
        db.query(ReminderSchedule)
        .filter(ReminderSchedule.invoice_id == invoice.id)
        .order_by(ReminderSchedule.step_index.asc(), ReminderSchedule.scheduled_at.asc())
        .all()
    )
    return ScheduleTimelineOut(invoice_id=invoice.id, items=items)


@router.patch("/{id}/schedule/{schedule_id}", response_model=ReminderScheduleOut)
def update_schedule_step(
    id: str,
    schedule_id: str,
    req: ReminderScheduleUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = _get_invoice(db, id, org.id)
    row = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.id == schedule_id,
            ReminderSchedule.invoice_id == invoice.id,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Schedule step not found")
    if row.status not in ("pending", "skipped"):
        raise HTTPException(status_code=400, detail="Only upcoming steps can be edited")

    if req.scheduled_at is not None:
        row.scheduled_at = req.scheduled_at
    if req.tone is not None:
        row.tone = req.tone
        row.draft_body = None
        row.draft_subject = None
    if req.template_id is not None:
        row.template_id = req.template_id
        row.draft_body = None
        row.draft_subject = None
    if row.status == "skipped":
        row.status = "pending"
        row.skip_reason = None

    db.commit()
    db.refresh(row)
    return row


@router.post("/{id}/pause")
def pause_reminders(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = _get_invoice(db, id, org.id)
    count = pause_pending_reminders(db, invoice.id)
    db.commit()
    return {"status": "paused", "skipped": count}


@router.post("/{id}/resume")
def resume_reminders(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = _get_invoice(db, id, org.id)
    if invoice.status == "paid":
        raise HTTPException(status_code=400, detail="Cannot resume reminders on paid invoices")

    assignment = (
        db.query(SequenceAssignment).filter(SequenceAssignment.invoice_id == invoice.id).first()
    )
    sequence = None
    if assignment:
        sequence = db.query(Sequence).filter(Sequence.id == assignment.sequence_id).first()
    count = resume_pending_reminders(db, invoice, sequence)
    db.commit()
    return {"status": "resumed", "steps": count}


@router.post("/{id}/send-now")
def send_now(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = _get_invoice(db, id, org.id)
    if invoice.stop_reminders or invoice.status in ("paid", "closed"):
        raise HTTPException(status_code=400, detail="Invoice is not eligible for sending")

    schedule = (
        db.query(ReminderSchedule)
        .filter(ReminderSchedule.invoice_id == invoice.id, ReminderSchedule.status == "pending")
        .order_by(ReminderSchedule.step_index.asc())
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="No pending reminder to send")

    schedule.scheduled_at = datetime.now(timezone.utc)
    result = process_single_reminder(db, schedule)
    db.commit()
    return result


@router.post("/{id}/regenerate-draft", response_model=DraftRegenerateOut)
def regenerate_draft(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    invoice = _get_invoice(db, id, org.id)
    schedule = (
        db.query(ReminderSchedule)
        .filter(ReminderSchedule.invoice_id == invoice.id, ReminderSchedule.status == "pending")
        .order_by(ReminderSchedule.step_index.asc())
        .first()
    )
    if not schedule:
        raise HTTPException(status_code=404, detail="No pending step to draft")

    # Force AI path by clearing template preference temporarily for draft regen
    schedule.draft_body = None
    schedule.draft_subject = None
    result = draft_reminder_content(db, schedule)
    # Prefer AI chain: call generate_reminder directly if template was used
    from app.services.ai.provider import generate_reminder
    from app.models.client import Client
    from app.services.client_profile import get_or_create_profile
    from app.models.organization import Organization
    from app.models.user import User

    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    profile = get_or_create_profile(db, invoice.client_id, invoice.org_id)
    org_row = db.query(Organization).filter(Organization.id == org.id).first()
    owner = db.query(User).filter(User.id == org_row.owner_user_id).first() if org_row else None
    draft = generate_reminder(
        invoice=invoice,
        client=client,
        client_profile=profile,
        step_index=schedule.step_index,
        tone=schedule.tone,
        owner_name=(owner.full_name if owner and owner.full_name else "Your Team"),
    )
    schedule.draft_subject = draft.subject
    schedule.draft_body = draft.body
    db.commit()
    return DraftRegenerateOut(subject=draft.subject, body=draft.body, provider=draft.provider)

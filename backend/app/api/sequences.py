from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.sequence import Sequence, SequenceAssignment
from app.models.invoice import Invoice
from app.schemas.sequence import (
    SequenceCreate,
    SequenceUpdate,
    SequenceOut,
    SequenceAssignRequest,
    SequenceAssignmentOut,
)
from app.services.reminder_engine import assign_sequence_and_schedule
from app.services.client_profile import get_or_create_profile

router = APIRouter(prefix="/sequences", tags=["Sequences"])


@router.get("", response_model=List[SequenceOut])
def list_sequences(
    status: Optional[str] = Query(None),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    query = db.query(Sequence).filter(Sequence.org_id == org.id)

    if status and status.lower() != "all":
        query = query.filter(Sequence.status == status.lower())

    query = query.order_by(Sequence.created_at.desc())
    return query.all()


@router.get("/{id}", response_model=SequenceOut)
def get_sequence_detail(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    sequence = db.query(Sequence).filter(Sequence.id == id, Sequence.org_id == org.id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    return sequence


@router.post("", response_model=SequenceOut)
def create_sequence(
    req: SequenceCreate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    steps_data = [step.model_dump() for step in req.steps]
    sequence = Sequence(
        org_id=org.id,
        name=req.name,
        status="active",
        steps=steps_data,
        stop_after_days=req.stop_after_days,
        is_default=False,
        auto_assign=False,
    )
    db.add(sequence)
    db.commit()
    db.refresh(sequence)
    return sequence


@router.patch("/{id}", response_model=SequenceOut)
def update_sequence(
    id: str,
    req: SequenceUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    sequence = db.query(Sequence).filter(Sequence.id == id, Sequence.org_id == org.id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")

    if req.name is not None:
        sequence.name = req.name
    if req.status is not None:
        sequence.status = req.status
    if req.steps is not None:
        sequence.steps = [step.model_dump() for step in req.steps]
    if req.stop_after_days is not None:
        sequence.stop_after_days = req.stop_after_days

    db.commit()
    db.refresh(sequence)
    return sequence


@router.delete("/{id}")
def delete_sequence(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    sequence = db.query(Sequence).filter(Sequence.id == id, Sequence.org_id == org.id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")

    db.delete(sequence)
    db.commit()
    return {"message": "Sequence deleted successfully"}


@router.post("/{id}/assign", response_model=SequenceAssignmentOut)
def assign_sequence_to_invoice(
    id: str,
    req: SequenceAssignRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    sequence = db.query(Sequence).filter(Sequence.id == id, Sequence.org_id == org.id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")

    invoice = db.query(Invoice).filter(Invoice.id == req.invoice_id, Invoice.org_id == org.id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    profile = get_or_create_profile(db, invoice.client_id, org.id)
    prefs = profile.preferences or {}
    assignment = assign_sequence_and_schedule(
        db,
        invoice,
        sequence,
        reliability_score=profile.reliability_score,
        dispute_count=profile.dispute_count,
        tone_pref=prefs.get("tone_pref"),
    )
    db.commit()
    db.refresh(assignment)
    return assignment


@router.post("/{id}/unassign")
def unassign_sequence_from_invoice(
    id: str,
    req: SequenceAssignRequest,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    from app.services.reminder_engine import cancel_pending_reminders

    _, org = user_and_org
    assignment = db.query(SequenceAssignment).filter(
        SequenceAssignment.sequence_id == id, SequenceAssignment.invoice_id == req.invoice_id
    ).first()

    if assignment:
        cancel_pending_reminders(db, req.invoice_id, reason="unassigned")
        db.delete(assignment)
        db.commit()

    return {"message": "Unassigned sequence from invoice"}


@router.post("/{id}/set-default", response_model=SequenceOut)
def set_default_sequence(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    sequence = db.query(Sequence).filter(Sequence.id == id, Sequence.org_id == org.id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")

    db.query(Sequence).filter(Sequence.org_id == org.id, Sequence.is_default.is_(True)).update(
        {"is_default": False}
    )
    sequence.is_default = True
    db.commit()
    db.refresh(sequence)
    return sequence


@router.post("/{id}/auto-assign", response_model=SequenceOut)
def toggle_auto_assign(
    id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    sequence = db.query(Sequence).filter(Sequence.id == id, Sequence.org_id == org.id).first()
    if not sequence:
        raise HTTPException(status_code=404, detail="Sequence not found")
    sequence.auto_assign = not sequence.auto_assign
    db.commit()
    db.refresh(sequence)
    return sequence

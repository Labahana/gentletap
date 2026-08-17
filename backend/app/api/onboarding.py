"""Onboarding wizard API."""

from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.invoice import Invoice
from app.services.ai.provider import generate_reminder
from app.services.client_profile import get_or_create_profile
from app.models.client import Client
from app.services.onboarding import advance_onboarding, get_or_create_onboarding

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


class StepPayload(BaseModel):
    step: int
    data: Optional[Dict[str, Any]] = None


@router.get("")
def get_onboarding(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    _, org = user_and_org
    state = get_or_create_onboarding(db, org.id)
    db.commit()
    return {
        "step": state.step,
        "completed_at": state.completed_at,
        "data": state.data or {},
        "complete": state.step >= 5 and state.completed_at is not None,
    }


@router.post("/step")
def post_step(
    req: StepPayload,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    state = advance_onboarding(db, org, req.step, req.data or {})
    db.commit()
    db.refresh(state)
    return {
        "step": state.step,
        "completed_at": state.completed_at,
        "data": state.data or {},
        "complete": state.completed_at is not None,
    }


@router.post("/skip")
def skip_onboarding(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    _, org = user_and_org
    state = get_or_create_onboarding(db, org.id)
    # keep current step so wizard can resume
    db.commit()
    return {"step": state.step, "skipped": True}


@router.get("/preview-drafts")
def preview_drafts(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = user_and_org
    invoices = (
        db.query(Invoice)
        .filter(Invoice.org_id == org.id, Invoice.status.in_(["unpaid", "chasing"]))
        .limit(3)
        .all()
    )
    drafts = []
    for inv in invoices:
        client = db.query(Client).filter(Client.id == inv.client_id).first()
        profile = get_or_create_profile(db, inv.client_id, org.id)
        for tone in ("warm", "friendly", "professional"):
            draft = generate_reminder(
                invoice=inv,
                client=client,
                client_profile=profile,
                step_index=0,
                tone=tone,
                owner_name=user.full_name or "Your Team",
            )
            drafts.append(
                {
                    "invoice_id": inv.id,
                    "invoice_number": inv.number,
                    "tone": tone,
                    "subject": draft.subject,
                    "body": draft.body,
                    "provider": draft.provider,
                }
            )
    db.commit()
    return {"drafts": drafts}

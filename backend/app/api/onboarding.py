"""Onboarding wizard API."""

from datetime import date, timedelta
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.invoice import Invoice
from app.services.ai.provider import _build_context
from app.services.ai.templates import render_static_body, render_static_subject
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
    data = state.data or {}
    return {
        "step": state.step,
        "completed_at": state.completed_at,
        "data": data,
        "complete": state.step >= 5 and state.completed_at is not None,
        "dismissed": bool(data.get("dismissed")),
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
    # Mark dismissed so the wizard doesn't re-open on next login. Keep the
    # current step in case they later choose to come back and finish.
    data = dict(state.data or {})
    data["dismissed"] = True
    state.data = data
    db.commit()
    return {"step": state.step, "skipped": True}


@router.post("/back")
def back_onboarding(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    _, org = user_and_org
    state = get_or_create_onboarding(db, org.id)
    state.step = max(1, state.step - 1)
    # Revisiting a step undoes completion; a user can't be "done" while going back.
    state.completed_at = None
    db.commit()
    db.refresh(state)
    data = state.data or {}
    return {
        "step": state.step,
        "completed_at": state.completed_at,
        "data": data,
        "complete": False,
        "dismissed": bool(data.get("dismissed")),
    }


class _SampleInvoice:
    """Lightweight stand-in so a fresh org still reaches the 'aha' draft.

    Mirrors only the fields generate_reminder reads, so no DB row is required.
    """

    id = "sample"
    number = "INV-1042"
    amount = 1250.00
    currency = "USD"
    due_date = date.today() - timedelta(days=9)


class _SampleClient:
    name = "Acme Studio"


class _SampleProfile:
    reliability_score = 92


def _static_draft(invoice: Any, client: Any, profile: Any, tone: str, owner_name: str) -> Dict[str, str]:
    """Build a draft instantly from static templates — no AI network call.

    Onboarding previews must resolve immediately (the AI providers can take
    30s+ or be unreachable), so we render the deterministic fallback bodies
    directly rather than going through generate_reminder's LLM chain.
    """
    ctx = _build_context(invoice, client, profile, tone, owner_name)
    return {
        "subject": render_static_subject(tone, ctx),
        "body": render_static_body(tone, ctx),
        "provider": "template",
    }


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
            draft = _static_draft(inv, client, profile, tone, user.full_name or "Your Team")
            drafts.append(
                {
                    "invoice_id": inv.id,
                    "invoice_number": inv.number,
                    "tone": tone,
                    "subject": draft["subject"],
                    "body": draft["body"],
                    "provider": draft["provider"],
                    "is_sample": False,
                }
            )

    # No unpaid invoices yet (fresh account or skipped connect): seed one sample
    # draft so the first-value moment still lands instead of an empty box.
    if not invoices:
        for tone in ("warm", "friendly", "professional"):
            draft = _static_draft(
                _SampleInvoice(), _SampleClient(), _SampleProfile(), tone, user.full_name or "Your Team"
            )
            drafts.append(
                {
                    "invoice_id": _SampleInvoice.id,
                    "invoice_number": _SampleInvoice.number,
                    "tone": tone,
                    "subject": draft["subject"],
                    "body": draft["body"],
                    "provider": draft["provider"],
                    "is_sample": True,
                }
            )
    db.commit()
    return {"drafts": drafts, "is_sample": bool(not invoices)}

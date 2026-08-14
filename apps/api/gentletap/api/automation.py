"""User control surface: automation settings, cadence, pause-all, guardrails."""

from datetime import datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from gentletap.database import AutomationSettings, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.automation_settings import (
    ALLOWED_CHANNELS,
    ALLOWED_TONES,
    MAX_CADENCE_STEPS,
    QuietHours,
    SendWindow,
    default_quiet_hours,
    default_send_window,
    get_automation_settings,
    normalize_cadence,
)
from gentletap.services.account_audit import record_event
from gentletap.services.team import account_id_for

router = APIRouter(prefix="/automation", tags=["automation"])


class CadenceStepBody(BaseModel):
    day_offset: int = Field(ge=-30, le=120)
    channel: str = Field(default="email")
    tone: str | None = None
    repeat_every_days: int | None = Field(default=None, ge=1, le=60)


class AutomationSettingsBody(BaseModel):
    cadence: dict | None = None
    autopilot: bool | None = None
    timezone: str | None = Field(default=None, max_length=64)
    send_window: dict | None = None
    skip_weekends: bool | None = None
    skip_holidays: bool | None = None
    holidays_country: str | None = Field(default=None, max_length=2)
    pause_all: bool | None = None
    pause_until: datetime | None = None
    pause_reason: str | None = Field(default=None, max_length=120)
    min_amount: float | None = Field(default=None, ge=0)
    suppress_disputed: bool | None = None
    suppress_on_reply: bool | None = None
    stop_on_payment: bool | None = None
    stop_on_claim: bool | None = None
    whatsapp_delay_hours: int | None = Field(default=None, ge=0, le=72)
    whatsapp_quiet_hours: dict | None = None
    signature_block: str | None = Field(default=None, max_length=2000)
    escalation_sender: dict | None = None
    cc_late_steps: list[str] | None = Field(default=None, max_length=8)


def _serialize(row: AutomationSettings) -> dict:
    return {
        "cadence": row.cadence,
        "autopilot": row.autopilot,
        "timezone": row.timezone,
        "send_window": row.send_window,
        "skip_weekends": row.skip_weekends,
        "skip_holidays": row.skip_holidays,
        "holidays_country": row.holidays_country,
        "pause_all": row.pause_all,
        "pause_until": row.pause_until.isoformat() if row.pause_until else None,
        "pause_reason": row.pause_reason,
        "min_amount": float(row.min_amount) if row.min_amount is not None else None,
        "suppress_disputed": row.suppress_disputed,
        "suppress_on_reply": row.suppress_on_reply,
        "stop_on_payment": row.stop_on_payment,
        "stop_on_claim": row.stop_on_claim,
        "whatsapp_delay_hours": row.whatsapp_delay_hours,
        "whatsapp_quiet_hours": row.whatsapp_quiet_hours,
        "signature_block": row.signature_block,
        "escalation_sender": row.escalation_sender,
        "cc_late_steps": row.cc_late_steps,
        "meta": {
            "allowed_channels": sorted(ALLOWED_CHANNELS),
            "allowed_tones": sorted(ALLOWED_TONES),
            "max_steps": MAX_CADENCE_STEPS,
            "default_send_window": default_send_window(),
            "default_quiet_hours": default_quiet_hours(),
        },
    }


@router.get("")
def read_automation(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    return _serialize(get_automation_settings(db, user.id))


@router.put("")
def update_automation(
    body: AutomationSettingsBody,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    row = get_automation_settings(db, user.id)

    if body.cadence is not None:
        row.cadence = normalize_cadence(body.cadence)
    if body.autopilot is not None:
        row.autopilot = body.autopilot
    if body.timezone is not None:
        row.timezone = body.timezone.strip() or "America/New_York"
    if body.send_window is not None:
        try:
            window = SendWindow.model_validate(body.send_window)
        except Exception:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid send window")
        if window.start >= window.end:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Send window start must be before end",
            )
        row.send_window = window.model_dump()
    if body.skip_weekends is not None:
        row.skip_weekends = body.skip_weekends
    if body.skip_holidays is not None:
        row.skip_holidays = body.skip_holidays
    if body.holidays_country is not None:
        row.holidays_country = body.holidays_country.upper() or None
    if body.pause_all is not None:
        row.pause_all = body.pause_all
    if body.pause_until is not None:
        row.pause_until = body.pause_until
    if body.pause_reason is not None:
        row.pause_reason = body.pause_reason.strip() or None
    if body.min_amount is not None:
        row.min_amount = body.min_amount
    if body.suppress_disputed is not None:
        row.suppress_disputed = body.suppress_disputed
    if body.suppress_on_reply is not None:
        row.suppress_on_reply = body.suppress_on_reply
    if body.stop_on_payment is not None:
        row.stop_on_payment = body.stop_on_payment
    if body.stop_on_claim is not None:
        row.stop_on_claim = body.stop_on_claim
    if body.whatsapp_delay_hours is not None:
        row.whatsapp_delay_hours = body.whatsapp_delay_hours
    if body.whatsapp_quiet_hours is not None:
        try:
            quiet = QuietHours.model_validate(body.whatsapp_quiet_hours)
        except Exception:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid quiet hours")
        row.whatsapp_quiet_hours = quiet.model_dump()
    if body.signature_block is not None:
        row.signature_block = body.signature_block.strip() or None
    if body.escalation_sender is not None:
        row.escalation_sender = body.escalation_sender
    if body.cc_late_steps is not None:
        row.cc_late_steps = [str(e).strip() for e in body.cc_late_steps if str(e).strip()]

    record_event(
        db,
        account_id=account_id_for(user),
        actor_user_id=user.id,
        action="automation.updated",
        metadata={"fields": sorted(body.model_fields_set)},
    )
    db.commit()
    db.refresh(row)
    return _serialize(row)


@router.post("/pause-all")
def pause_all(
    user: CurrentUser,
    body: dict | None = None,
    db: Session = Depends(get_db),
) -> dict:
    row = get_automation_settings(db, user.id)
    row.pause_all = True
    if body and body.get("pause_until"):
        try:
            row.pause_until = datetime.fromisoformat(str(body["pause_until"]))
        except ValueError:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid pause_until")
    row.pause_reason = (body or {}).get("reason") or "manual"
    record_event(db, account_id=account_id_for(user), actor_user_id=user.id, action="automation.paused")
    db.commit()
    return {"paused": True, "pause_until": row.pause_until.isoformat() if row.pause_until else None}


@router.post("/resume-all")
def resume_all(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    row = get_automation_settings(db, user.id)
    row.pause_all = False
    row.pause_until = None
    row.pause_reason = None
    record_event(db, account_id=account_id_for(user), actor_user_id=user.id, action="automation.resumed")
    db.commit()
    return {"paused": False}

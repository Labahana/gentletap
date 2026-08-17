"""Onboarding wizard step validation & progression."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.connection import Connection
from app.models.onboarding_state import OnboardingState
from app.models.organization import Organization
from app.services.autopilot import ensure_autopilot_assets
from app.services.plan_gating import can_use_autopilot, require_feature
from app.services.reminder_engine import get_or_create_org_settings


def get_or_create_onboarding(db: Session, org_id: str) -> OnboardingState:
    row = db.query(OnboardingState).filter(OnboardingState.org_id == org_id).first()
    if row:
        return row
    row = OnboardingState(org_id=org_id, step=1, data={})
    db.add(row)
    db.flush()
    return row


def validate_step(db: Session, org: Organization, step: int, data: Dict[str, Any]) -> tuple[bool, str]:
    if step == 1:
        has_conn = db.query(Connection).filter(Connection.org_id == org.id).count() > 0
        csv_ok = bool(data.get("accounting_connected") or data.get("csv_imported"))
        if not has_conn and not csv_ok:
            return False, "Connect QuickBooks, FreshBooks, or import a CSV to continue."
        return True, ""
    if step == 2:
        if not data.get("sender_verified") and not data.get("sender_email"):
            return False, "Add a sender email to continue."
        return True, ""
    if step == 3:
        if not data.get("templates_previewed"):
            return False, "Preview and confirm at least one AI draft."
        return True, ""
    if step == 4:
        mode = data.get("operation_mode")
        if mode not in ("template", "autopilot"):
            return False, "Choose Template or Autopilot mode."
        if mode == "autopilot" and not can_use_autopilot(org):
            return False, "Upgrade to Pro to use Autopilot, or choose Template mode."
        return True, ""
    if step == 5:
        return True, ""
    return False, "Invalid step"


def advance_onboarding(
    db: Session,
    org: Organization,
    step: int,
    payload: Optional[Dict[str, Any]] = None,
) -> OnboardingState:
    state = get_or_create_onboarding(db, org.id)
    data = dict(state.data or {})
    if payload:
        data.update(payload)

    ok, err = validate_step(db, org, step, data)
    if not ok:
        from fastapi import HTTPException

        raise HTTPException(status_code=400, detail=err)

    if step == 1:
        data["accounting_connected"] = True
    if step == 2:
        data["sender_verified"] = True
        if payload and payload.get("sender_email"):
            settings_row = get_or_create_org_settings(db, org.id)
            # store sender hint in signature area / preferences
            data["sender_email"] = payload["sender_email"]
    if step == 3:
        data["templates_previewed"] = True
    if step == 4:
        mode = data.get("operation_mode", "template")
        settings_row = get_or_create_org_settings(db, org.id)
        if mode == "autopilot":
            require_feature(org, "autopilot")
            ensure_autopilot_assets(db, org.id)
            settings_row.operation_mode = "autopilot"
        else:
            settings_row.operation_mode = "template"
        data["operation_mode"] = mode

    state.data = data
    next_step = min(5, step + 1) if step < 5 else 5
    if step == 5:
        state.step = 5
        state.completed_at = datetime.now(timezone.utc)
    else:
        state.step = max(state.step, next_step)

    db.flush()
    return state

"""Onboarding wizard step validation & progression."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.models.connection import Connection
from app.models.onboarding_state import OnboardingState
from app.models.organization import Organization
from app.services.autopilot import ensure_autopilot_assets
from app.services.plan_gating import can_use_autopilot  # noqa: F401  (kept for API compatibility)
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
        sample_ok = bool(data.get("sample"))
        if not has_conn and not csv_ok and not sample_ok:
            return False, "Connect QuickBooks, FreshBooks, import a CSV, or try a sample invoice to continue."
        return True, ""
    if step == 2:
        sender = data.get("sender")
        if sender not in ("gentletap", "gmail"):
            return False, "Choose a sender to continue."
        if sender == "gmail":
            has_gmail = (
                db.query(Connection)
                .filter(
                    Connection.org_id == org.id,
                    Connection.provider.in_(["gmail", "google"]),
                    Connection.status == "active",
                )
                .count()
                > 0
            )
            if not has_gmail:
                return False, "Connect your Gmail account first, or use GentleTap's sender."
        return True, ""
    if step == 3:
        if not data.get("templates_previewed"):
            return False, "Preview and confirm at least one AI draft."
        return True, ""
    if step == 4:
        mode = data.get("operation_mode")
        if mode not in ("template", "autopilot"):
            return False, "Choose Template or Autopilot mode."
        # Both modes are selectable on every plan — the free plan simply caps
        # monthly collections; upgrading to Pro removes the cap.
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
        if not data.get("sample"):
            data["accounting_connected"] = True
    if step == 2:
        data["sender"] = data.get("sender") or "gentletap"
        settings_row = get_or_create_org_settings(db, org.id)
        defaults = dict(settings_row.reminder_defaults or {})
        defaults["sender_pref"] = data["sender"]
        settings_row.reminder_defaults = defaults
    if step == 3:
        data["templates_previewed"] = True
        tone = data.get("tone")
        if tone in ("warm", "friendly", "professional", "firm", "urgent"):
            settings_row = get_or_create_org_settings(db, org.id)
            defaults = dict(settings_row.reminder_defaults or {})
            defaults["default_tone"] = tone
            settings_row.reminder_defaults = defaults
    if step == 4:
        mode = data.get("operation_mode", "template")
        settings_row = get_or_create_org_settings(db, org.id)
        if mode == "autopilot":
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

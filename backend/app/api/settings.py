from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.schemas.settings import (
    SettingsOut,
    SettingsUpdate,
    OperationModeOut,
    OperationModeUpdate,
    ReminderDefaultsOut,
    ReminderDefaultsUpdate,
    AutomationPauseIn,
)
from app.services.reminder_engine import get_or_create_org_settings
from app.services.autopilot import ensure_autopilot_assets, disable_autopilot_assignment

router = APIRouter(prefix="/settings", tags=["Settings"])

_APPROVAL_MODES = ("off", "first_batch", "amount_threshold")


def _settings_out(user, org, row) -> SettingsOut:
    return SettingsOut(
        user_name=user.full_name or user.email,
        email=user.email,
        org_name=org.name,
        signature=row.signature or ("Warmly,\n" + (user.full_name or "Your Team")),
        branding_logo_url=row.branding_logo_url,
        timezone=row.timezone or "America/New_York",
        email_notifications=row.email_notifications,
        digest_frequency=row.digest_frequency or "daily",
        operation_mode=row.operation_mode or "template",
        send_thank_you=row.send_thank_you,
        daily_digest=row.daily_digest,
        payment_alerts=row.payment_alerts,
        escalation_alerts=row.escalation_alerts,
        stop_after_days=row.stop_after_days,
        contact_window_enabled=row.contact_window_enabled,
        pause_all=row.pause_all,
        pause_until=row.pause_until,
        pause_reason=row.pause_reason,
        min_amount=float(row.min_amount) if row.min_amount is not None else None,
        suppress_on_reply=row.suppress_on_reply,
        approval_mode=row.approval_mode or "off",
        approval_threshold_amount=(
            float(row.approval_threshold_amount) if row.approval_threshold_amount is not None else None
        ),
        whatsapp_delay_hours=row.whatsapp_delay_hours,
        whatsapp_quiet_hours=row.whatsapp_quiet_hours,
        send_window_days=row.send_window_days,
        skip_weekends=row.skip_weekends,
    )


@router.get("", response_model=SettingsOut)
def get_settings_data(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    row = get_or_create_org_settings(db, org.id)
    db.commit()
    return _settings_out(user, org, row)


@router.patch("", response_model=SettingsOut)
def update_settings_data(
    req: SettingsUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    row = get_or_create_org_settings(db, org.id)

    if req.user_name is not None:
        user.full_name = req.user_name
    if req.org_name is not None:
        org.name = req.org_name
    if req.signature is not None:
        row.signature = req.signature
    if req.branding_logo_url is not None:
        row.branding_logo_url = req.branding_logo_url
    if req.timezone is not None:
        row.timezone = req.timezone
    if req.email_notifications is not None:
        row.email_notifications = req.email_notifications
    if req.digest_frequency is not None:
        row.digest_frequency = req.digest_frequency
    if req.send_thank_you is not None:
        row.send_thank_you = req.send_thank_you
    if req.daily_digest is not None:
        row.daily_digest = req.daily_digest
    if req.payment_alerts is not None:
        row.payment_alerts = req.payment_alerts
    if req.escalation_alerts is not None:
        row.escalation_alerts = req.escalation_alerts
    if req.stop_after_days is not None:
        row.stop_after_days = req.stop_after_days
    if req.contact_window_enabled is not None:
        row.contact_window_enabled = req.contact_window_enabled
    if req.min_amount is not None:
        row.min_amount = req.min_amount
    elif "min_amount" in req.model_fields_set:
        row.min_amount = None  # explicit null clears the floor
    if req.suppress_on_reply is not None:
        row.suppress_on_reply = req.suppress_on_reply
    if req.approval_mode is not None:
        if req.approval_mode not in _APPROVAL_MODES:
            raise HTTPException(
                status_code=400,
                detail=f"approval_mode must be one of {list(_APPROVAL_MODES)}",
            )
        row.approval_mode = req.approval_mode
    if req.approval_threshold_amount is not None:
        row.approval_threshold_amount = req.approval_threshold_amount
    elif "approval_threshold_amount" in req.model_fields_set:
        row.approval_threshold_amount = None
    if req.whatsapp_delay_hours is not None:
        row.whatsapp_delay_hours = req.whatsapp_delay_hours
    if req.whatsapp_quiet_hours is not None:
        row.whatsapp_quiet_hours = _validate_quiet_hours(req.whatsapp_quiet_hours)
    elif "whatsapp_quiet_hours" in req.model_fields_set:
        row.whatsapp_quiet_hours = None
    if req.send_window_days is not None:
        row.send_window_days = _validate_send_window_days(req.send_window_days)
    elif "send_window_days" in req.model_fields_set:
        row.send_window_days = None
    if req.skip_weekends is not None:
        row.skip_weekends = req.skip_weekends

    db.commit()
    db.refresh(user)
    db.refresh(org)
    db.refresh(row)
    return _settings_out(user, org, row)


def _validate_quiet_hours(value):
    if value == {}:
        return None
    try:
        start = int(value["start"])
        end = int(value["end"])
    except (KeyError, TypeError, ValueError):
        raise HTTPException(status_code=400, detail="quiet_hours needs integer 'start' and 'end' (0-23)")
    if not (0 <= start <= 23 and 0 <= end <= 23):
        raise HTTPException(status_code=400, detail="quiet_hours hours must be 0-23")
    return {"start": start, "end": end}


def _validate_send_window_days(value):
    if value == []:
        return None
    try:
        days = sorted({int(d) for d in value})
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="send_window_days must be a list of weekday numbers 0-6")
    if not days or days[0] < 0 or days[-1] > 6:
        raise HTTPException(status_code=400, detail="send_window_days must be weekday numbers 0-6")
    return days


@router.post("/pause-all")
def pause_all_reminders(
    req: AutomationPauseIn,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    row = get_or_create_org_settings(db, org.id)
    row.pause_all = True
    row.pause_until = req.until
    row.pause_reason = (req.reason or "")[:255] or None
    db.commit()
    return {
        "status": "paused",
        "pause_all": True,
        "pause_until": row.pause_until,
        "pause_reason": row.pause_reason,
    }


@router.post("/resume-all")
def resume_all_reminders(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    row = get_or_create_org_settings(db, org.id)
    row.pause_all = False
    row.pause_until = None
    row.pause_reason = None
    db.commit()
    return {"status": "resumed", "pause_all": False}


@router.get("/operation-mode", response_model=OperationModeOut)
def get_operation_mode(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    row = get_or_create_org_settings(db, org.id)
    db.commit()
    return OperationModeOut(mode=row.operation_mode)


@router.patch("/operation-mode", response_model=OperationModeOut)
def patch_operation_mode(
    req: OperationModeUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    mode = (req.mode or "").lower()
    if mode not in ("template", "autopilot"):
        raise HTTPException(status_code=400, detail="mode must be 'template' or 'autopilot'")

    row = get_or_create_org_settings(db, org.id)

    if mode == "autopilot":
        if row.operation_mode != "autopilot" and not req.confirm:
            raise HTTPException(
                status_code=400,
                detail="Confirm switching to Autopilot (confirm=true). This generates templates and a default sequence.",
            )
        # Autopilot is available on every plan; the free plan is instead capped
        # by the monthly collections quota.
        ensure_autopilot_assets(db, org.id)
        row.operation_mode = "autopilot"
    else:
        disable_autopilot_assignment(db, org.id)
        row.operation_mode = "template"

    db.commit()
    return OperationModeOut(mode=row.operation_mode)


@router.get("/reminders", response_model=ReminderDefaultsOut)
def get_reminder_defaults(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    row = get_or_create_org_settings(db, org.id)
    db.commit()
    return ReminderDefaultsOut(
        stop_after_days=row.stop_after_days,
        contact_window_enabled=row.contact_window_enabled,
        send_thank_you=row.send_thank_you,
        reminder_defaults=row.reminder_defaults,
        operation_mode=row.operation_mode,
    )


@router.patch("/reminders", response_model=ReminderDefaultsOut)
def patch_reminder_defaults(
    req: ReminderDefaultsUpdate,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    row = get_or_create_org_settings(db, org.id)
    if req.stop_after_days is not None:
        row.stop_after_days = req.stop_after_days
    if req.contact_window_enabled is not None:
        row.contact_window_enabled = req.contact_window_enabled
    if req.send_thank_you is not None:
        row.send_thank_you = req.send_thank_you
    if req.reminder_defaults is not None:
        row.reminder_defaults = req.reminder_defaults
    db.commit()
    db.refresh(row)
    return ReminderDefaultsOut(
        stop_after_days=row.stop_after_days,
        contact_window_enabled=row.contact_window_enabled,
        send_thank_you=row.send_thank_you,
        reminder_defaults=row.reminder_defaults,
        operation_mode=row.operation_mode,
    )

@router.post("/export-data")
def export_data(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    user, org = user_and_org
    from app.services.plan_gating import require_owner
    from app.tasks.billing_tasks import export_org_data_task
    require_owner(user, org)
    try:
        export_org_data_task.delay(org.id, user.email)
    except Exception:
        export_org_data_task(org.id, user.email)
    return {"status": "queued", "message": "Export started. A download link will be emailed shortly."}


@router.delete("/account")
def delete_account(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    from datetime import datetime, timezone
    from app.services.plan_gating import require_owner
    from app.services.email import send_email_via_resend
    user, org = user_and_org
    require_owner(user, org)
    user.is_deleting = True
    org.deletion_requested_at = datetime.now(timezone.utc)
    db.commit()
    send_email_via_resend(
        user.email,
        "GentleTap account deletion requested",
        f"Hi,\n\nWe received a request to delete {org.name}. Your data will be permanently removed in 30 days.\nLog in within that window to cancel.\n\n- GentleTap",
    )
    return {"status": "deletion_scheduled", "grace_days": 30}


@router.post("/account/cancel-deletion")
def cancel_deletion(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    from app.services.plan_gating import require_owner
    user, org = user_and_org
    require_owner(user, org)
    user.is_deleting = False
    org.deletion_requested_at = None
    db.commit()
    return {"status": "deletion_cancelled"}

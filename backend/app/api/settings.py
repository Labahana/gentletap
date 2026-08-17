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
)
from app.services.reminder_engine import get_or_create_org_settings
from app.services.autopilot import ensure_autopilot_assets, disable_autopilot_assignment

router = APIRouter(prefix="/settings", tags=["Settings"])


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

    db.commit()
    db.refresh(user)
    db.refresh(org)
    db.refresh(row)
    return _settings_out(user, org, row)


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
        from app.services.plan_gating import require_feature

        require_feature(org, "autopilot")
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

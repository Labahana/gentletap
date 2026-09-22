from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, EmailStr, Field


class SettingsOut(BaseModel):
    user_name: str
    email: EmailStr
    org_name: str
    signature: Optional[str] = None
    branding_logo_url: Optional[str] = None
    timezone: str = "America/New_York"
    email_notifications: bool = True
    digest_frequency: str = "daily"
    operation_mode: str = "template"
    send_thank_you: bool = True
    daily_digest: bool = True
    payment_alerts: bool = True
    escalation_alerts: bool = True
    stop_after_days: int = 30
    contact_window_enabled: bool = True
    # Control-center guardrails
    pause_all: bool = False
    pause_until: Optional[datetime] = None
    pause_reason: Optional[str] = None
    min_amount: Optional[float] = None
    suppress_on_reply: bool = True
    approval_mode: str = "off"
    approval_threshold_amount: Optional[float] = None
    whatsapp_delay_hours: int = 3
    whatsapp_quiet_hours: Optional[Dict[str, int]] = None
    send_window_days: Optional[list] = None
    skip_weekends: bool = False


class SettingsUpdate(BaseModel):
    user_name: Optional[str] = None
    org_name: Optional[str] = None
    signature: Optional[str] = None
    branding_logo_url: Optional[str] = None
    timezone: Optional[str] = None
    email_notifications: Optional[bool] = None
    digest_frequency: Optional[str] = None
    send_thank_you: Optional[bool] = None
    daily_digest: Optional[bool] = None
    payment_alerts: Optional[bool] = None
    escalation_alerts: Optional[bool] = None
    stop_after_days: Optional[int] = None
    contact_window_enabled: Optional[bool] = None
    min_amount: Optional[float] = None
    suppress_on_reply: Optional[bool] = None
    approval_mode: Optional[str] = None
    approval_threshold_amount: Optional[float] = None
    whatsapp_delay_hours: Optional[int] = Field(default=None, ge=0, le=168)
    whatsapp_quiet_hours: Optional[Dict[str, int]] = None
    send_window_days: Optional[list] = None
    skip_weekends: Optional[bool] = None


class AutomationPauseIn(BaseModel):
    until: Optional[datetime] = None  # null = indefinite
    reason: Optional[str] = None


class OperationModeOut(BaseModel):
    mode: str  # template | autopilot


class OperationModeUpdate(BaseModel):
    mode: str
    confirm: bool = False


class ReminderDefaultsOut(BaseModel):
    stop_after_days: int = 30
    contact_window_enabled: bool = True
    send_thank_you: bool = True
    reminder_defaults: Optional[Dict[str, Any]] = None
    operation_mode: str = "template"


class ReminderDefaultsUpdate(BaseModel):
    stop_after_days: Optional[int] = None
    contact_window_enabled: Optional[bool] = None
    send_thank_you: Optional[bool] = None
    reminder_defaults: Optional[Dict[str, Any]] = None

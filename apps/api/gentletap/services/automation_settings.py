"""Per-user automation control center: cadence, send window, guardrails."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from uuid import UUID

from pydantic import BaseModel, Field, field_validator
from sqlalchemy.orm import Session
from zoneinfo import ZoneInfo

from gentletap.database import AutomationSettings

DEFAULT_CADENCE_DAYS = [0, 3, 7, 14, 21]
DEFAULT_CADENCE_CHANNEL = "email"

ALLOWED_CHANNELS = {"email", "whatsapp", "both", "off"}
ALLOWED_TONES = {"soft", "neutral", "firm", "final"}

MAX_CADENCE_STEPS = 12
MAX_STEP_OFFSET_DAYS = 120


class CadenceStep(BaseModel):
    day_offset: int = Field(ge=-30, le=MAX_STEP_OFFSET_DAYS)
    channel: str = Field(default=DEFAULT_CADENCE_CHANNEL)
    tone: str | None = Field(default=None)
    repeat_every_days: int | None = Field(default=None, ge=1, le=60)


class SendWindow(BaseModel):
    start: int = Field(default=8, ge=0, le=23)
    end: int = Field(default=18, ge=0, le=23)
    days: list[int] = Field(default_factory=lambda: [0, 1, 2, 3, 4])  # 0=Mon

    @field_validator("days")
    @classmethod
    def _valid_days(cls, v: list[int]) -> list[int]:
        days = sorted({int(d) for d in v if isinstance(d, int) and 0 <= d <= 6})
        return days or [0, 1, 2, 3, 4]


class QuietHours(BaseModel):
    start: int = Field(default=21, ge=0, le=23)
    end: int = Field(default=8, ge=0, le=23)


def default_cadence() -> dict:
    return {
        "steps": [
            {"day_offset": d, "channel": DEFAULT_CADENCE_CHANNEL, "tone": None, "repeat_every_days": None}
            for d in DEFAULT_CADENCE_DAYS
        ],
        "pre_due_enabled": False,
        "pre_due_days": [],
        "thank_you_on_payment": False,
    }


def default_send_window() -> dict:
    return SendWindow().model_dump()


def default_quiet_hours() -> dict:
    return {"start": 21, "end": 8}


def normalize_cadence(raw: dict | None) -> dict:
    """Validate a stored cadence; fall back to default when invalid/missing."""
    if not isinstance(raw, dict):
        return default_cadence()
    steps_raw = raw.get("steps")
    if not isinstance(steps_raw, list) or not steps_raw:
        return default_cadence()
    steps: list[dict] = []
    for item in steps_raw[:MAX_CADENCE_STEPS]:
        try:
            step = CadenceStep.model_validate(item)
        except Exception:
            continue
        if step.channel not in ALLOWED_CHANNELS:
            step.channel = DEFAULT_CADENCE_CHANNEL
        if step.tone is not None and step.tone not in ALLOWED_TONES:
            step.tone = None
        steps.append(step.model_dump())
    if not steps:
        return default_cadence()
    steps.sort(key=lambda s: s["day_offset"])
    return {
        "steps": steps,
        "pre_due_enabled": bool(raw.get("pre_due_enabled")),
        "pre_due_days": [int(d) for d in raw.get("pre_due_days", []) if isinstance(d, (int, float))][:4],
        "thank_you_on_payment": bool(raw.get("thank_you_on_payment")),
    }


def get_automation_settings(db: Session, user_id: UUID) -> AutomationSettings:
    row = db.query(AutomationSettings).filter(AutomationSettings.user_id == user_id).one_or_none()
    if row is None:
        row = AutomationSettings(
            user_id=user_id,
            cadence=default_cadence(),
            send_window=default_send_window(),
            whatsapp_quiet_hours=default_quiet_hours(),
            autopilot=True,
        )
        db.add(row)
        db.flush()
    return row


def cadence_for(db: Session, user_id: UUID, *, client=None, invoice=None) -> dict:
    """Resolve cadence: invoice override > client override > account settings > default."""
    for source in (getattr(invoice, "cadence_override", None), getattr(client, "cadence_override", None)):
        if source:
            return normalize_cadence(source)
    settings = get_automation_settings(db, user_id)
    return normalize_cadence(settings.cadence)


def cadence_steps(cadence: dict) -> list[dict]:
    return list(cadence.get("steps", []))


def step_for_index(cadence: dict, index: int) -> dict | None:
    steps = cadence_steps(cadence)
    if 0 <= index < len(steps):
        return steps[index]
    return None


def max_step_index(cadence: dict) -> int:
    return max(0, len(cadence_steps(cadence)) - 1)


def _tz(name: str | None) -> ZoneInfo:
    try:
        return ZoneInfo(name or "UTC")
    except Exception:
        return ZoneInfo("UTC")


def is_paused(settings: AutomationSettings) -> bool:
    if not settings.pause_all:
        return False
    if settings.pause_until is None:
        return True
    until = settings.pause_until
    if until.tzinfo is None:
        until = until.replace(tzinfo=UTC)
    return datetime.now(UTC) < until


def next_send_time(
    *,
    now_utc: datetime,
    timezone_name: str,
    send_window: dict | None,
    skip_weekends: bool,
    skip_holidays: bool = False,
    holidays_country: str | None = None,
    quiet_hours: dict | None = None,
) -> datetime:
    """Return the next allowed send time in UTC given the user's window rules."""
    tz = _tz(timezone_name)
    window = SendWindow.model_validate(send_window or default_send_window())
    quiet = quiet_hours or {}

    candidate = now_utc.astimezone(tz).replace(second=0, microsecond=0)
    holidays: set[date] = set()
    if skip_holidays and holidays_country:
        try:
            import holidays as holidays_lib

            holidays = set(holidays_lib.country_holidays(holidays_country.upper(), years=[candidate.year, candidate.year + 1]).keys())
        except Exception:
            holidays = set()

    def allowed(local_dt: datetime) -> bool:
        if local_dt.weekday() not in window.days:
            return False
        if skip_weekends and local_dt.weekday() >= 5:
            return False
        if local_dt.date() in holidays:
            return False
        if not (window.start <= local_dt.hour < window.end):
            return False
        if quiet:
            q_start = int(quiet.get("start", 21))
            q_end = int(quiet.get("end", 8))
            h = local_dt.hour
            in_quiet = (h >= q_start or h < q_end) if q_start > q_end else (q_start <= h < q_end)
            if in_quiet:
                return False
        return True

    # search forward up to 14 days in hourly increments
    for _ in range(14 * 24):
        if allowed(candidate):
            return candidate.astimezone(UTC)
        candidate += timedelta(hours=1)
    return now_utc + timedelta(hours=1)


def whatsapp_followup_time(
    *,
    after: datetime,
    timezone_name: str,
    delay_hours: int,
    quiet_hours: dict | None,
) -> datetime:
    """WhatsApp sends after `delay_hours`, nudged out of quiet hours."""
    tz = _tz(timezone_name)
    quiet = quiet_hours or default_quiet_hours()
    local = (after + timedelta(hours=delay_hours)).astimezone(tz)
    q_start = int(quiet.get("start", 21))
    q_end = int(quiet.get("end", 8))

    def in_quiet(dt: datetime) -> bool:
        h = dt.hour
        return (h >= q_start or h < q_end) if q_start > q_end else (q_start <= h < q_end)

    if in_quiet(local):
        local = local.replace(hour=q_end, minute=0, second=0, microsecond=0)
        if local <= after.astimezone(tz):
            local += timedelta(days=1)
    return local.astimezone(UTC)


def should_suppress_invoice(*, settings: AutomationSettings, invoice, client=None) -> str | None:
    """Return a reason string when automation must not touch this invoice."""
    if is_paused(settings):
        return "paused"
    if client is not None and getattr(client, "do_not_contact", False):
        return "do_not_contact"
    if settings.suppress_disputed and getattr(invoice, "dispute_flag", False):
        return "disputed"
    if settings.min_amount is not None and float(invoice.balance) < float(settings.min_amount):
        return "below_min_amount"
    expected = getattr(invoice, "expected_payment_date", None)
    if expected is not None and date.today() <= expected:
        return "awaiting_expected_payment"
    return None


def channel_for_step(step: dict, *, client=None) -> str:
    override = getattr(client, "channel_override", None)
    if override in ALLOWED_CHANNELS:
        return override
    channel = step.get("channel") or DEFAULT_CADENCE_CHANNEL
    return channel if channel in ALLOWED_CHANNELS else DEFAULT_CADENCE_CHANNEL


def tone_for_step(step: dict) -> str | None:
    tone = step.get("tone")
    return tone if tone in ALLOWED_TONES else None

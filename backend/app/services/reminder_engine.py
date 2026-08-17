"""Reminder schedule computation, contact window, and next-send logic."""

from __future__ import annotations

import logging
from datetime import date, datetime, time, timedelta, timezone
from typing import Any, List, Optional
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.invoice import Invoice
from app.models.org_settings import OrgSettings
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence, SequenceAssignment
from app.services.ai.tones import select_tone

logger = logging.getLogger(__name__)
settings = get_settings()


def get_or_create_org_settings(db: Session, org_id: str) -> OrgSettings:
    row = db.query(OrgSettings).filter(OrgSettings.org_id == org_id).first()
    if row:
        return row
    row = OrgSettings(org_id=org_id)
    db.add(row)
    db.flush()
    return row


def resolve_timezone(tz_name: Optional[str]) -> ZoneInfo:
    try:
        return ZoneInfo(tz_name or "America/New_York")
    except Exception:
        return ZoneInfo("America/New_York")


def is_within_contact_window(
    when: datetime,
    tz_name: Optional[str] = None,
    start_hour: Optional[int] = None,
    end_hour: Optional[int] = None,
    enabled: bool = True,
) -> bool:
    if not enabled:
        return True
    tz = resolve_timezone(tz_name)
    local = when.astimezone(tz) if when.tzinfo else when.replace(tzinfo=timezone.utc).astimezone(tz)
    start = start_hour if start_hour is not None else settings.contact_window_start_hour
    end = end_hour if end_hour is not None else settings.contact_window_end_hour
    return start <= local.hour < end


def next_valid_send_time(
    when: datetime,
    tz_name: Optional[str] = None,
    best_send_hour: Optional[int] = None,
    enabled: bool = True,
) -> datetime:
    """If outside contact window, bump to next day at best_send_hour (default 9am)."""
    if not enabled or is_within_contact_window(when, tz_name=tz_name, enabled=enabled):
        return when if when.tzinfo else when.replace(tzinfo=timezone.utc)

    tz = resolve_timezone(tz_name)
    local = when.astimezone(tz) if when.tzinfo else when.replace(tzinfo=timezone.utc).astimezone(tz)
    hour = best_send_hour if best_send_hour is not None else 9
    # If before window today, use today at hour; else next day
    start = settings.contact_window_start_hour
    if local.hour < start:
        candidate = datetime.combine(local.date(), time(hour=hour), tzinfo=tz)
    else:
        candidate = datetime.combine(local.date() + timedelta(days=1), time(hour=hour), tzinfo=tz)
    return candidate.astimezone(timezone.utc)


def compute_days_overdue(invoice: Invoice, as_of: Optional[date] = None) -> int:
    if not invoice.due_date:
        return 0
    as_of = as_of or date.today()
    return max(0, (as_of - invoice.due_date).days)


def build_schedule_for_assignment(
    db: Session,
    invoice: Invoice,
    sequence: Sequence,
    reliability_score: int = 100,
    dispute_count: int = 0,
    tone_pref: Optional[str] = None,
    tz_name: Optional[str] = None,
    best_send_hour: Optional[int] = None,
) -> List[ReminderSchedule]:
    """Create pending ReminderSchedule rows for each enabled sequence step."""
    # Clear existing pending rows for this invoice
    db.query(ReminderSchedule).filter(
        ReminderSchedule.invoice_id == invoice.id,
        ReminderSchedule.status == "pending",
    ).delete(synchronize_session=False)

    base_date = invoice.due_date or date.today()
    org_settings = get_or_create_org_settings(db, invoice.org_id)
    tz = org_settings.timezone or tz_name or "America/New_York"
    window_on = org_settings.contact_window_enabled

    created: List[ReminderSchedule] = []
    steps = sequence.steps or []
    for idx, step in enumerate(steps):
        if isinstance(step, dict):
            enabled = step.get("enabled", True)
            day_offset = int(step.get("day_offset", 0))
            tone = step.get("tone") or select_tone(day_offset, reliability_score, dispute_count, tone_pref)
            template_id = step.get("template_id")
        else:
            enabled = getattr(step, "enabled", True)
            day_offset = int(getattr(step, "day_offset", 0))
            tone = getattr(step, "tone", None) or select_tone(
                day_offset, reliability_score, dispute_count, tone_pref
            )
            template_id = getattr(step, "template_id", None)

        if not enabled:
            continue

        # Adjust tone if not explicitly set in step with preference logic
        if isinstance(step, dict) and not step.get("tone"):
            tone = select_tone(day_offset, reliability_score, dispute_count, tone_pref)

        target_local_date = base_date + timedelta(days=day_offset)
        naive_local = datetime.combine(target_local_date, time(hour=best_send_hour or 9))
        scheduled = next_valid_send_time(
            naive_local.replace(tzinfo=resolve_timezone(tz)),
            tz_name=tz,
            best_send_hour=best_send_hour,
            enabled=window_on,
        )

        row = ReminderSchedule(
            invoice_id=invoice.id,
            org_id=invoice.org_id,
            step_index=idx,
            scheduled_at=scheduled,
            tone=tone,
            template_id=template_id,
            channel="email",
            status="pending",
        )
        db.add(row)
        created.append(row)

    if invoice.status == "unpaid" and created:
        invoice.status = "chasing"
        if not invoice.first_overdue_at and invoice.due_date and invoice.due_date < date.today():
            invoice.first_overdue_at = datetime.now(timezone.utc)

    db.flush()
    return created


def assign_sequence_and_schedule(
    db: Session,
    invoice: Invoice,
    sequence: Sequence,
    reliability_score: int = 100,
    dispute_count: int = 0,
    tone_pref: Optional[str] = None,
) -> SequenceAssignment:
    assignment = (
        db.query(SequenceAssignment)
        .filter(
            SequenceAssignment.sequence_id == sequence.id,
            SequenceAssignment.invoice_id == invoice.id,
        )
        .first()
    )
    if not assignment:
        assignment = SequenceAssignment(
            sequence_id=sequence.id,
            invoice_id=invoice.id,
            status="active",
        )
        db.add(assignment)
        db.flush()
    else:
        assignment.status = "active"

    org_settings = get_or_create_org_settings(db, invoice.org_id)
    build_schedule_for_assignment(
        db,
        invoice,
        sequence,
        reliability_score=reliability_score,
        dispute_count=dispute_count,
        tone_pref=tone_pref,
        tz_name=org_settings.timezone,
    )
    return assignment


def cancel_pending_reminders(db: Session, invoice_id: str, reason: str = "cancelled") -> int:
    rows = (
        db.query(ReminderSchedule)
        .filter(ReminderSchedule.invoice_id == invoice_id, ReminderSchedule.status == "pending")
        .all()
    )
    for row in rows:
        row.status = "cancelled"
        row.skip_reason = reason
    return len(rows)


def pause_pending_reminders(db: Session, invoice_id: str) -> int:
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if invoice:
        invoice.stop_reminders = True
    rows = (
        db.query(ReminderSchedule)
        .filter(ReminderSchedule.invoice_id == invoice_id, ReminderSchedule.status == "pending")
        .all()
    )
    for row in rows:
        row.status = "skipped"
        row.skip_reason = "paused"
    return len(rows)


def resume_pending_reminders(db: Session, invoice: Invoice, sequence: Optional[Sequence] = None) -> int:
    invoice.stop_reminders = False
    if sequence:
        build_schedule_for_assignment(db, invoice, sequence)
        return len(sequence.steps or [])
    # Re-activate skipped paused rows that are still in the future
    rows = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.invoice_id == invoice.id,
            ReminderSchedule.status == "skipped",
            ReminderSchedule.skip_reason == "paused",
        )
        .all()
    )
    now = datetime.now(timezone.utc)
    for row in rows:
        if row.scheduled_at < now:
            row.scheduled_at = next_valid_send_time(now)
        row.status = "pending"
        row.skip_reason = None
    return len(rows)

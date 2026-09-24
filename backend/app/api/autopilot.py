"""Autopilot control center: one aggregate endpoint the UI polls for status."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.client import Client
from app.models.connection import Connection
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.payout import Payout
from app.models.reminder_schedule import ReminderSchedule
from app.models.sequence import Sequence, SequenceAssignment
from app.services.autopilot import ensure_autopilot_assets, disable_autopilot_assignment
from app.services.reminder_engine import get_or_create_org_settings

router = APIRouter(prefix="/autopilot", tags=["Autopilot"])

ACTIVE_SCHEDULE_STATES = ("pending", "processing", "awaiting_approval")


def _next_send(db: Session, org_id: str):
    return (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.org_id == org_id,
            ReminderSchedule.status == "pending",
            ReminderSchedule.scheduled_at >= datetime.now(timezone.utc) - timedelta(hours=1),
        )
        .order_by(ReminderSchedule.scheduled_at.asc())
        .first()
    )


def _last_action(db: Session, org_id: str):
    message = (
        db.query(Message, Client.name.label("client_name"), Invoice.number.label("invoice_number"))
        .join(Client, Message.client_id == Client.id)
        .join(Invoice, Message.invoice_id == Invoice.id)
        .filter(Message.org_id == org_id)
        .order_by(Message.created_at.desc())
        .first()
    )
    payout = (
        db.query(Payout, Client.name.label("client_name"), Invoice.number.label("invoice_number"))
        .join(Invoice, Payout.invoice_id == Invoice.id)
        .join(Client, Invoice.client_id == Client.id)
        .filter(Payout.org_id == org_id)
        .order_by(Payout.paid_at.desc())
        .first()
    )
    msg_row = message[0] if message else None
    pay_row = payout[0] if payout else None
    msg_at = msg_row.created_at if msg_row else None
    pay_at = pay_row.paid_at if pay_row else None

    if pay_at and (not msg_at or pay_at > msg_at):
        return {
            "type": "payment",
            "title": f"Payment received from {payout[1]}",
            "subtitle": f"Invoice #{payout[2]}",
            "timestamp": pay_at,
        }
    if msg_at:
        return {
            "type": "send",
            "title": f"Reminder sent to {message[1]}",
            "subtitle": f"Invoice #{message[2]} • {(msg_row.subject or '')[:60]}",
            "timestamp": msg_at,
        }
    return None


@router.get("/status")
def autopilot_status(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    settings_row = get_or_create_org_settings(db, org.id)
    db.commit()

    mode = settings_row.operation_mode or "template"
    paused = bool(settings_row.pause_all)
    pause_until = settings_row.pause_until
    if pause_until is not None and pause_until.tzinfo is None:
        # SQLite hands back naive datetimes; treat stored values as UTC.
        pause_until = pause_until.replace(tzinfo=timezone.utc)
    pause_expired = paused and pause_until is not None and pause_until <= datetime.now(timezone.utc)
    if pause_expired:
        settings_row.pause_all = False
        settings_row.pause_until = None
        settings_row.pause_reason = None
        db.commit()
        paused = False

    active_sequences = (
        db.query(SequenceAssignment)
        .join(Invoice, SequenceAssignment.invoice_id == Invoice.id)
        .filter(Invoice.org_id == org.id, SequenceAssignment.status == "active")
        .count()
    )

    pending_approvals = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.org_id == org.id,
            ReminderSchedule.status == "awaiting_approval",
        )
        .count()
    )

    scheduled_total = (
        db.query(ReminderSchedule)
        .filter(
            ReminderSchedule.org_id == org.id,
            ReminderSchedule.status.in_(ACTIVE_SCHEDULE_STATES),
        )
        .count()
    )

    start_of_day = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    sent_today = (
        db.query(Message)
        .filter(
            Message.org_id == org.id,
            Message.created_at >= start_of_day,
            Message.status != "failed",
        )
        .count()
    )

    next_row = _next_send(db, org.id)
    next_send = None
    if next_row is not None:
        invoice = db.query(Invoice).filter(Invoice.id == next_row.invoice_id).first()
        client = (
            db.query(Client).filter(Client.id == invoice.client_id).first() if invoice else None
        )
        next_send = {
            "schedule_id": next_row.id,
            "invoice_id": next_row.invoice_id,
            "invoice_number": invoice.number if invoice else None,
            "client_name": client.name if client else None,
            "tone": next_row.tone,
            "channel": next_row.channel,
            "scheduled_at": next_row.scheduled_at,
            "step_index": next_row.step_index,
        }

    default_sequence = (
        db.query(Sequence)
        .filter(Sequence.org_id == org.id, Sequence.is_default.is_(True))
        .first()
    )
    sequences = (
        db.query(Sequence)
        .filter(Sequence.org_id == org.id)
        .order_by(Sequence.is_default.desc(), Sequence.created_at.asc())
        .all()
    )

    connected_sources = (
        db.query(Connection)
        .filter(Connection.org_id == org.id, Connection.status == "active")
        .count()
    )
    last_sync = (
        db.query(func.max(Connection.last_sync_at))
        .filter(Connection.org_id == org.id, Connection.status == "active")
        .scalar()
    )

    return {
        "mode": mode,
        "active": mode == "autopilot" and not paused,
        "paused": paused,
        "pause_until": settings_row.pause_until,
        "pause_reason": settings_row.pause_reason,
        "active_sequences": active_sequences,
        "pending_approvals": pending_approvals,
        "scheduled_reminders": scheduled_total,
        "sent_today": sent_today,
        "next_send": next_send,
        "last_action": _last_action(db, org.id),
        "connected_sources": connected_sources,
        "last_sync_at": last_sync,
        "default_sequence": (
            {
                "id": default_sequence.id,
                "name": default_sequence.name,
                "status": default_sequence.status,
                "auto_assign": default_sequence.auto_assign,
                "stop_after_days": default_sequence.stop_after_days,
                "steps": default_sequence.steps or [],
            }
            if default_sequence
            else None
        ),
        "sequences": [
            {
                "id": s.id,
                "name": s.name,
                "status": s.status,
                "is_default": s.is_default,
                "auto_assign": s.auto_assign,
                "steps": s.steps or [],
                "stop_after_days": s.stop_after_days,
            }
            for s in sequences
        ],
    }


@router.post("/enable")
def enable_autopilot(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    """One-click go-live: create tone templates + default sequence and switch mode."""
    _, org = user_and_org
    settings_row = get_or_create_org_settings(db, org.id)
    assets = ensure_autopilot_assets(db, org.id)
    settings_row.operation_mode = "autopilot"
    settings_row.pause_all = False
    settings_row.pause_until = None
    settings_row.pause_reason = None
    db.commit()
    return {"mode": "autopilot", **assets}


@router.post("/disable")
def disable_autopilot(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    settings_row = get_or_create_org_settings(db, org.id)
    disable_autopilot_assignment(db, org.id)
    settings_row.operation_mode = "template"
    db.commit()
    return {"mode": "template"}

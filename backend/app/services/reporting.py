"""Daily digest and monthly report generators."""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.models.message import Message
from app.models.payout import Payout
from app.models.reminder_schedule import ReminderSchedule


def build_daily_digest(db: Session, org_id: str, day: date | None = None) -> Dict[str, Any]:
    day = day or (date.today() - timedelta(days=1))
    start = datetime.combine(day, datetime.min.time()).replace(tzinfo=timezone.utc)
    end = start + timedelta(days=1)

    payments = (
        db.query(Payout)
        .filter(Payout.org_id == org_id, Payout.paid_at >= start, Payout.paid_at < end)
        .all()
    )
    sends = (
        db.query(Message)
        .filter(Message.org_id == org_id, Message.created_at >= start, Message.created_at < end)
        .all()
    )
    opened = sum(1 for m in sends if m.opened_at)
    clicked = sum(1 for m in sends if m.clicked_at)

    thirty_ago = date.today() - timedelta(days=30)
    escalations = (
        db.query(Invoice)
        .filter(
            Invoice.org_id == org_id,
            Invoice.status.in_(["unpaid", "chasing"]),
            Invoice.due_date.isnot(None),
            Invoice.due_date <= thirty_ago,
        )
        .count()
    )

    return {
        "date": str(day),
        "payments_received": len(payments),
        "payments_amount": float(sum(float(p.amount) for p in payments)),
        "reminders_sent": len(sends),
        "opens": opened,
        "clicks": clicked,
        "escalations": escalations,
    }


def build_monthly_report(db: Session, org_id: str, year: int | None = None, month: int | None = None) -> Dict[str, Any]:
    today = date.today()
    year = year or today.year
    month = month or (today.month - 1 or 12)
    if month == 12 and year == today.year and today.month == 1:
        year = today.year - 1

    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    collected = (
        db.query(func.coalesce(func.sum(Payout.amount), 0.0))
        .filter(Payout.org_id == org_id, Payout.paid_at >= start, Payout.paid_at < end)
        .scalar()
    )
    sent_count = (
        db.query(Message)
        .filter(Message.org_id == org_id, Message.created_at >= start, Message.created_at < end)
        .count()
    )
    opened = (
        db.query(Message)
        .filter(
            Message.org_id == org_id,
            Message.created_at >= start,
            Message.created_at < end,
            Message.opened_at.isnot(None),
        )
        .count()
    )

    return {
        "period": f"{year}-{month:02d}",
        "total_collected": float(collected or 0),
        "reminders_sent": sent_count,
        "open_rate": (opened / sent_count) if sent_count else 0.0,
        "time_saved_hours": round(sent_count * 0.08, 1),  # ~5 min per manual chase
    }


def format_digest_email(org_name: str, digest: Dict[str, Any]) -> tuple[str, str]:
    subject = f"GentleTap daily digest — {digest['date']}"
    body = (
        f"Hi,\n\n"
        f"Here's yesterday's summary for {org_name}:\n\n"
        f"• Payments received: {digest['payments_received']} (${digest['payments_amount']:,.2f})\n"
        f"• Reminders sent: {digest['reminders_sent']}\n"
        f"• Opens / clicks: {digest['opens']} / {digest['clicks']}\n"
        f"• At-risk escalations: {digest['escalations']}\n\n"
        f"— GentleTap"
    )
    return subject, body

"""Analytics: month-over-month metrics, collection trends, channel/risk breakdowns."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.client import Client
from app.models.client_profile import ClientProfile
from app.models.invoice import Invoice
from app.models.message import Message


def month_start(now: Optional[datetime] = None) -> datetime:
    now = now or datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end = datetime(year, month + 1, 1, tzinfo=timezone.utc)
    return start, end


def prev_month_start() -> datetime:
    start = month_start()
    if start.month == 1:
        return start.replace(year=start.year - 1, month=12)
    return start.replace(month=start.month - 1)


def collected_between(db: Session, org_id: str, start: datetime, end: datetime) -> float:
    val = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(
            Invoice.org_id == org_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= start,
            Invoice.paid_at < end,
        )
        .scalar()
        or 0
    )
    return float(val)


def avg_payment_days_for_range(db: Session, org_id: str, start: datetime, end: datetime) -> Optional[float]:
    rows = (
        db.query(Invoice)
        .filter(
            Invoice.org_id == org_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= start,
            Invoice.paid_at < end,
            Invoice.due_date.isnot(None),
        )
        .all()
    )
    days = [
        (inv.paid_at.date() - inv.due_date).days
        for inv in rows
        if inv.paid_at and inv.due_date
    ]
    if not days:
        return None
    return round(sum(days) / len(days), 1)


def build_mom_metrics(db: Session, org_id: str) -> dict:
    now = datetime.now(timezone.utc)
    this_start = month_start(now)
    last_start = prev_month_start()

    collected_this = collected_between(db, org_id, this_start, now)
    collected_last = collected_between(db, org_id, last_start, this_start)

    if collected_last > 0:
        collected_mom_pct = round(((collected_this - collected_last) / collected_last) * 100)
    elif collected_this > 0:
        collected_mom_pct = 100
    else:
        collected_mom_pct = None

    avg_this = avg_payment_days_for_range(db, org_id, this_start, now)
    avg_last = avg_payment_days_for_range(db, org_id, last_start, this_start)

    avg_days_delta = None
    if avg_this is not None and avg_last is not None:
        avg_days_delta = round(avg_this - avg_last, 1)

    return {
        "collected_mom_pct": collected_mom_pct,
        "collected_last_month": collected_last,
        "avg_days_delta": avg_days_delta,
        "avg_days_last_month": avg_last,
    }


def monthly_collection_trend(db: Session, org_id: str, months: int = 6) -> list[dict]:
    now = datetime.now(timezone.utc)
    items = []
    y, m = now.year, now.month
    for _ in range(months):
        start, end = _month_bounds(y, m)
        if start >= month_start(now):
            end = now
        collected = collected_between(db, org_id, start, end)
        items.append({"month": start.strftime("%b"), "year": y, "collected": collected})
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    items.reverse()
    return items


def _risk_level(reliability: int) -> str:
    if reliability >= 80:
        return "low"
    if reliability >= 50:
        return "medium"
    return "high"


def build_analytics(db: Session, org_id: str) -> dict:
    mom = build_mom_metrics(db, org_id)
    trend = monthly_collection_trend(db, org_id, 6)
    this_start = month_start()

    reminders_by_channel = (
        db.query(Message.channel, func.count(Message.id))
        .filter(Message.org_id == org_id, Message.status.in_(["sent", "delivered", "opened", "clicked"]))
        .group_by(Message.channel)
        .all()
    )
    channel_breakdown = {r[0]: r[1] for r in reminders_by_channel}

    profiles = db.query(ClientProfile).filter(ClientProfile.org_id == org_id).all()
    risk_counts: dict[str, int] = {"low": 0, "medium": 0, "high": 0}
    for p in profiles:
        risk_counts[_risk_level(p.reliability_score)] += 1

    top_clients = (
        db.query(
            Client.id,
            Client.name,
            func.coalesce(func.sum(Invoice.balance), 0),
        )
        .join(Invoice, Invoice.client_id == Client.id)
        .filter(Client.org_id == org_id, Invoice.balance > 0)
        .group_by(Client.id, Client.name)
        .order_by(func.coalesce(func.sum(Invoice.balance), 0).desc())
        .limit(5)
        .all()
    )

    total_clients = db.query(func.count(Client.id)).filter(Client.org_id == org_id).scalar() or 0

    paid_this_month = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.org_id == org_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= this_start,
        )
        .scalar()
        or 0
    )

    reminders_sent = (
        db.query(func.count(Message.id))
        .filter(
            Message.org_id == org_id,
            Message.status.in_(["sent", "delivered", "opened", "clicked"]),
            Message.sent_at >= this_start,
        )
        .scalar()
        or 0
    )

    response_rate = round((paid_this_month / reminders_sent) * 100) if reminders_sent > 0 else None

    currency_row = db.query(Invoice.currency).filter(Invoice.org_id == org_id).first()

    avg_days = (
        db.query(func.avg(ClientProfile.avg_days_to_pay))
        .filter(ClientProfile.org_id == org_id, ClientProfile.avg_days_to_pay > 0)
        .scalar()
    )

    return {
        "currency": currency_row[0] if currency_row else "USD",
        "total_clients": total_clients,
        "reminders_sent_this_month": reminders_sent,
        "paid_this_month": paid_this_month,
        "response_rate": response_rate,
        "avg_days_to_pay": round(float(avg_days), 1) if avg_days is not None else None,
        "collection_trend": trend,
        "reminders_by_channel": channel_breakdown,
        "clients_by_risk": risk_counts,
        "top_clients_outstanding": [
            {"id": str(r[0]), "name": r[1], "outstanding": float(r[2])} for r in top_clients
        ],
        **mom,
    }

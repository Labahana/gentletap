"""Analytics and month-over-month metrics."""

from datetime import UTC, datetime

from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, ReminderMessage
from gentletap.services.plan_limits import month_start


def _month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    start = datetime(year, month, 1, tzinfo=UTC)
    if month == 12:
        end = datetime(year + 1, 1, 1, tzinfo=UTC)
    else:
        end = datetime(year, month + 1, 1, tzinfo=UTC)
    return start, end


def prev_month_start() -> datetime:
    start = month_start()
    if start.month == 1:
        return start.replace(year=start.year - 1, month=12)
    return start.replace(month=start.month - 1)


def collected_between(db: Session, user_id, start: datetime, end: datetime) -> float:
    val = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(
            Invoice.user_id == user_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= start,
            Invoice.paid_at < end,
        )
        .scalar()
        or 0
    )
    return float(val)


def avg_payment_days_for_range(db: Session, user_id, start: datetime, end: datetime) -> float | None:
    rows = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= start,
            Invoice.paid_at < end,
            Invoice.due_date.isnot(None),
        )
        .all()
    )
    if not rows:
        return None
    days = []
    for inv in rows:
        paid = inv.paid_at.date() if inv.paid_at else None
        if paid and inv.due_date:
            days.append((paid - inv.due_date).days)
    if not days:
        return None
    return round(sum(days) / len(days), 1)


def build_mom_metrics(db: Session, user_id) -> dict:
    this_start = month_start()
    last_start = prev_month_start()

    collected_this = collected_between(db, user_id, this_start, datetime.now(UTC))
    collected_last = collected_between(db, user_id, last_start, this_start)

    if collected_last > 0:
        collected_mom_pct = round(((collected_this - collected_last) / collected_last) * 100)
    elif collected_this > 0:
        collected_mom_pct = 100
    else:
        collected_mom_pct = None

    avg_this = avg_payment_days_for_range(db, user_id, this_start, datetime.now(UTC))
    avg_last = avg_payment_days_for_range(db, user_id, last_start, this_start)

    avg_days_delta = None
    if avg_this is not None and avg_last is not None:
        avg_days_delta = round(avg_this - avg_last, 1)

    return {
        "collected_mom_pct": collected_mom_pct,
        "collected_last_month": collected_last,
        "avg_days_delta": avg_days_delta,
        "avg_days_last_month": avg_last,
    }


def monthly_collection_trend(db: Session, user_id, months: int = 6) -> list[dict]:
    now = datetime.now(UTC)
    items = []
    y, m = now.year, now.month
    for _ in range(months):
        start, end = _month_bounds(y, m)
        if start >= month_start():
            end = now
        collected = collected_between(db, user_id, start, end)
        items.append({"month": start.strftime("%b"), "year": y, "collected": collected})
        m -= 1
        if m == 0:
            m = 12
            y -= 1
    items.reverse()
    return items


def build_analytics(db: Session, user_id) -> dict:
    mom = build_mom_metrics(db, user_id)
    trend = monthly_collection_trend(db, user_id, 6)

    reminders_by_channel = (
        db.query(ReminderMessage.channel, func.count(ReminderMessage.id))
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .filter(Invoice.user_id == user_id, ReminderMessage.status == "sent")
        .group_by(ReminderMessage.channel)
        .all()
    )
    channel_breakdown = {r[0]: r[1] for r in reminders_by_channel}

    risk_breakdown = (
        db.query(Client.risk_level, func.count(Client.id))
        .filter(Client.user_id == user_id)
        .group_by(Client.risk_level)
        .all()
    )
    risk_counts = {r[0]: r[1] for r in risk_breakdown}

    top_clients = (
        db.query(
            Client.id,
            Client.name,
            func.coalesce(func.sum(Invoice.balance), 0),
        )
        .join(Invoice, Invoice.client_id == Client.id)
        .filter(Client.user_id == user_id, Invoice.balance > 0)
        .group_by(Client.id, Client.name)
        .order_by(func.coalesce(func.sum(Invoice.balance), 0).desc())
        .limit(5)
        .all()
    )

    total_clients = db.query(func.count(Client.id)).filter(Client.user_id == user_id).scalar() or 0

    active_sequences = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.sequence_active.is_(True))
        .scalar()
        or 0
    )

    paid_this_month = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.user_id == user_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= month_start(),
        )
        .scalar()
        or 0
    )

    reminders_sent = (
        db.query(func.count(ReminderMessage.id))
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .filter(
            Invoice.user_id == user_id,
            ReminderMessage.status == "sent",
            ReminderMessage.sent_at >= month_start(),
        )
        .scalar()
        or 0
    )

    response_rate = round((paid_this_month / reminders_sent) * 100) if reminders_sent > 0 else None

    currency_row = (
        db.query(Invoice.currency)
        .filter(Invoice.user_id == user_id)
        .first()
    )

    avg_days = (
        db.query(func.avg(Client.avg_days_to_pay))
        .filter(Client.user_id == user_id, Client.avg_days_to_pay.isnot(None))
        .scalar()
    )

    return {
        "currency": currency_row[0] if currency_row else "USD",
        "total_clients": total_clients,
        "active_sequences": active_sequences,
        "reminders_sent_this_month": reminders_sent,
        "paid_this_month": paid_this_month,
        "response_rate": response_rate,
        "avg_days_to_pay": round(float(avg_days), 1) if avg_days is not None else None,
        "collection_trend": trend,
        "reminders_by_channel": channel_breakdown,
        "clients_by_risk": {
            "low": risk_counts.get("low", 0),
            "medium": risk_counts.get("medium", 0),
            "high": risk_counts.get("high", 0),
        },
        "top_clients_outstanding": [
            {"id": str(r[0]), "name": r[1], "outstanding": float(r[2])} for r in top_clients
        ],
        **mom,
    }

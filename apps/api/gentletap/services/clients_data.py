"""Client list and detail aggregations."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice


def _outstanding_by_client(db: Session, user_id) -> dict:
    rows = (
        db.query(
            Invoice.client_id,
            func.coalesce(func.sum(Invoice.balance), 0),
            func.count(Invoice.id),
        )
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .group_by(Invoice.client_id)
        .all()
    )
    return {r[0]: {"outstanding": float(r[1]), "unpaid_count": r[2]} for r in rows}


def _active_chase_by_client(db: Session, user_id) -> dict:
    rows = (
        db.query(Invoice.client_id, func.count(Invoice.id))
        .filter(
            Invoice.user_id == user_id,
            Invoice.sequence_active.is_(True),
            Invoice.balance > 0,
        )
        .group_by(Invoice.client_id)
        .all()
    )
    return {r[0]: r[1] for r in rows}


def list_clients(db: Session, user_id, limit: int = 100, offset: int = 0) -> dict:
    q = db.query(Client).filter(Client.user_id == user_id)
    total = q.count()
    clients = q.order_by(Client.name.asc()).offset(offset).limit(limit).all()
    outstanding_map = _outstanding_by_client(db, user_id)
    chase_map = _active_chase_by_client(db, user_id)

    items = []
    for c in clients:
        stats = outstanding_map.get(c.id, {"outstanding": 0.0, "unpaid_count": 0})
        items.append(
            {
                "id": str(c.id),
                "name": c.name,
                "email": c.email,
                "phone": c.phone,
                "risk_level": c.risk_level,
                "avg_days_to_pay": float(c.avg_days_to_pay) if c.avg_days_to_pay is not None else None,
                "late_payment_rate": float(c.late_payment_rate),
                "lifetime_value": float(c.lifetime_value),
                "tenure_months": c.tenure_months,
                "preferred_channel": c.preferred_channel,
                "email_suppressed": c.email_suppressed,
                "outstanding": stats["outstanding"],
                "unpaid_count": stats["unpaid_count"],
                "active_chase_count": chase_map.get(c.id, 0),
            }
        )

    items.sort(key=lambda x: (-x["outstanding"], x["name"]))
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def client_detail(db: Session, user_id, client_id) -> dict | None:
    client = (
        db.query(Client)
        .filter(Client.id == client_id, Client.user_id == user_id)
        .one_or_none()
    )
    if client is None:
        return None

    invoices = (
        db.query(Invoice)
        .filter(Invoice.client_id == client.id, Invoice.user_id == user_id)
        .order_by(Invoice.days_overdue.desc(), Invoice.balance.desc())
        .limit(20)
        .all()
    )

    outstanding = sum(float(i.balance) for i in invoices if float(i.balance) > 0)

    return {
        "id": str(client.id),
        "name": client.name,
        "email": client.email,
        "phone": client.phone,
        "risk_level": client.risk_level,
        "communication_style": client.communication_style,
        "avg_days_to_pay": float(client.avg_days_to_pay) if client.avg_days_to_pay is not None else None,
        "late_payment_rate": float(client.late_payment_rate),
        "invoices_paid_on_time": client.invoices_paid_on_time,
        "invoices_paid_late": client.invoices_paid_late,
        "lifetime_value": float(client.lifetime_value),
        "tenure_months": client.tenure_months,
        "preferred_channel": client.preferred_channel,
        "email_suppressed": client.email_suppressed,
        "outstanding": outstanding,
        "invoices": [
            {
                "id": str(inv.id),
                "doc_number": inv.doc_number,
                "amount": float(inv.amount),
                "balance": float(inv.balance),
                "currency": inv.currency,
                "days_overdue": inv.days_overdue,
                "status": inv.status,
                "sequence_active": inv.sequence_active,
                "due_date": inv.due_date.isoformat() if inv.due_date else None,
            }
            for inv in invoices
        ],
    }

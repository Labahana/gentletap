"""Client list and detail aggregations."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice


def _active_chase_by_client(db: Session, user_id, client_ids: list | None = None) -> dict:
    q = db.query(Invoice.client_id, func.count(Invoice.id)).filter(
        Invoice.user_id == user_id,
        Invoice.sequence_active.is_(True),
        Invoice.balance > 0,
    )
    if client_ids:
        q = q.filter(Invoice.client_id.in_(client_ids))
    rows = q.group_by(Invoice.client_id).all()
    return {r[0]: r[1] for r in rows}


def list_clients(db: Session, user_id, limit: int = 100, offset: int = 0) -> dict:
    total = db.query(func.count(Client.id)).filter(Client.user_id == user_id).scalar() or 0

    # Aggregate outstanding per client in SQL so ordering/pagination happen on the
    # database side. Re-sorting a single page in Python produced wrong page contents.
    outstanding_sq = (
        db.query(
            Invoice.client_id.label("client_id"),
            func.coalesce(func.sum(Invoice.balance), 0).label("outstanding"),
            func.count(Invoice.id).label("unpaid_count"),
        )
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .group_by(Invoice.client_id)
        .subquery()
    )
    outstanding_col = func.coalesce(outstanding_sq.c.outstanding, 0)

    rows = (
        db.query(Client, outstanding_col, outstanding_sq.c.unpaid_count)
        .outerjoin(outstanding_sq, Client.id == outstanding_sq.c.client_id)
        .filter(Client.user_id == user_id)
        .order_by(outstanding_col.desc(), Client.name.asc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    client_ids = [c.id for c, _, _ in rows]
    chase_map = _active_chase_by_client(db, user_id, client_ids)

    items = []
    for c, outstanding, unpaid_count in rows:
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
                "outstanding": float(outstanding or 0),
                "unpaid_count": int(unpaid_count or 0),
                "active_chase_count": chase_map.get(c.id, 0),
            }
        )

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

    # Aggregate across ALL unpaid invoices, not just the 20 shown, so clients with
    # more than 20 open invoices report the correct total.
    outstanding = float(
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(
            Invoice.client_id == client.id,
            Invoice.user_id == user_id,
            Invoice.balance > 0,
        )
        .scalar()
        or 0
    )

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

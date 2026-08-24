"""Client relationship profiles computed from local invoice history.

Adapted from the old QuickBooks-live profiler: the new project keeps invoices
synced locally, so profiling is provider-agnostic and needs no external calls.
"""

from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.intelligence.risk_scorer import baseline_risk_from_history
from app.models.client import Client
from app.models.client_profile import ClientProfile
from app.models.invoice import Invoice


def _months_between(start: date, end: date) -> int:
    return max(0, (end.year - start.year) * 12 + (end.month - start.month))


def profile_client(db: Session, client: Client) -> ClientProfile | None:
    """Recompute payment-history stats for one client and upsert ClientProfile."""
    org_id = client.org_id
    invoices = (
        db.query(Invoice)
        .filter(Invoice.client_id == client.id, Invoice.org_id == org_id)
        .all()
    )

    on_time = 0
    late = 0
    days_list: list[int] = []
    total_value = 0.0

    for inv in invoices:
        if inv.balance and float(inv.balance) > 0:
            continue  # unpaid — not part of payment history yet
        total_value += float(inv.amount or 0)
        if not inv.paid_at or not inv.due_date:
            continue
        paid_on = inv.paid_at.date() if hasattr(inv.paid_at, "date") else inv.paid_at
        days = (paid_on - inv.due_date).days
        if days < -365 or days > 365:
            continue  # outlier — skip rather than skew avg_days_to_pay
        days_list.append(days)
        if days <= 0:
            on_time += 1
        else:
            late += 1

    total_paid = on_time + late
    late_rate = (late / total_paid) if total_paid else 0.0
    avg_days = round(sum(days_list) / len(days_list), 2) if days_list else 0.0
    reliability = round((on_time / total_paid) * 100) if total_paid else 100
    risk = baseline_risk_from_history(late_rate).value

    tenure = 0
    if client.relationship_started_at:
        started = client.relationship_started_at.date()
        tenure = _months_between(started, date.today())

    profile = (
        db.query(ClientProfile).filter(ClientProfile.client_id == client.id).one_or_none()
    )
    if profile is None:
        profile = ClientProfile(client_id=client.id, org_id=org_id)
        db.add(profile)

    profile.avg_days_to_pay = avg_days
    profile.reliability_score = reliability
    profile.late_count = late
    profile.total_invoices = len(invoices)
    profile.total_paid = total_paid
    profile.history = {
        "late_payment_rate": round(late_rate, 4),
        "lifetime_value": round(total_value, 2),
        "tenure_months": tenure,
        "risk_level": risk,
        "avg_days_to_pay_raw": avg_days,
    }
    db.commit()
    db.refresh(profile)
    return profile


def reprofile_org_clients(db: Session, org_id: str) -> int:
    clients = db.query(Client).filter(Client.org_id == org_id).all()
    for client in clients:
        profile_client(db, client)
    return len(clients)


def now_utc() -> datetime:
    return datetime.now(timezone.utc)

"""Client payment behavior scoring."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.models.client_profile import ClientProfile
from app.models.invoice import Invoice


def compute_reliability_score(avg_days_late: float, late_count: int, dispute_count: int) -> int:
    score = 100 - (avg_days_late * 2) - (late_count * 5) - (dispute_count * 10)
    return int(max(0, min(100, round(score))))


def recompute_client_profile(db: Session, client_id: str, org_id: str) -> ClientProfile:
    invoices: List[Invoice] = (
        db.query(Invoice).filter(Invoice.client_id == client_id, Invoice.org_id == org_id).all()
    )
    paid = [i for i in invoices if i.status == "paid" and i.paid_at and i.due_date]
    disputed = [i for i in invoices if i.status == "disputed"]

    days_list = []
    late_count = 0
    for inv in paid:
        paid_date = inv.paid_at.date() if hasattr(inv.paid_at, "date") else inv.paid_at
        delta = (paid_date - inv.due_date).days
        days_list.append(delta)
        if delta > 3:
            late_count += 1

    avg_days = sum(days_list) / len(days_list) if days_list else 0.0
    avg_late = max(0.0, avg_days)  # only late portion for scoring
    dispute_count = len(disputed)
    score = compute_reliability_score(avg_late, late_count, dispute_count)

    history = [
        {
            "invoice_id": i.id,
            "number": i.number,
            "status": i.status,
            "due_date": str(i.due_date) if i.due_date else None,
            "paid_at": i.paid_at.isoformat() if i.paid_at else None,
            "amount": float(i.amount),
        }
        for i in invoices
    ]

    profile = db.query(ClientProfile).filter(ClientProfile.client_id == client_id).first()
    if not profile:
        profile = ClientProfile(client_id=client_id, org_id=org_id, preferences={})
        db.add(profile)

    profile.avg_days_to_pay = float(avg_days)
    profile.reliability_score = score
    profile.late_count = late_count
    profile.dispute_count = dispute_count
    profile.total_invoices = len(invoices)
    profile.total_paid = len(paid)
    profile.history = history
    profile.last_updated = datetime.now(timezone.utc)
    if profile.preferences is None:
        profile.preferences = {}

    db.flush()
    return profile


def get_or_create_profile(db: Session, client_id: str, org_id: str) -> ClientProfile:
    profile = db.query(ClientProfile).filter(ClientProfile.client_id == client_id).first()
    if profile:
        return profile
    return recompute_client_profile(db, client_id, org_id)


def update_preferences(
    db: Session,
    client_id: str,
    org_id: str,
    channel_pref: Optional[str] = None,
    tone_pref: Optional[str] = None,
    best_send_time: Optional[str] = None,
) -> ClientProfile:
    profile = get_or_create_profile(db, client_id, org_id)
    prefs: Dict[str, Any] = dict(profile.preferences or {})
    if channel_pref is not None:
        prefs["channel_pref"] = channel_pref
    if tone_pref is not None:
        prefs["tone_pref"] = tone_pref
    if best_send_time is not None:
        prefs["best_send_time"] = best_send_time
    profile.preferences = prefs
    db.flush()
    return profile

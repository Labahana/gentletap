"""Live account context for authenticated chat users.

Strictly org-scoped to the caller's own organization (mirrors context_builder's
discipline). Anonymous/public callers get None. Keep it a compact snapshot — the
point is to let the assistant answer "why is invoice X chasing?" or "how many
overdue do I have?" without dumping the whole DB into the prompt.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.models.org_settings import OrgSettings
from app.models.organization import Organization
from app.models.reminder_job import ReminderJob
from app.models.user import User


def build_account_summary(db: Session, org: Organization, user: Optional[User]) -> Optional[dict]:
    if org is None:
        return None

    status_counts = dict(
        db.query(Invoice.status, func.count(Invoice.id))
        .filter(Invoice.org_id == org.id)
        .group_by(Invoice.status)
        .all()
    )
    today = date.today()
    overdue = (
        db.query(Invoice)
        .filter(
            Invoice.org_id == org.id,
            Invoice.status.in_(["unpaid", "chasing"]),
            Invoice.due_date.isnot(None),
            Invoice.due_date < today,
        )
        .all()
    )
    overdue_amount = round(sum(float(i.balance or 0) for i in overdue), 2)

    pending_jobs = (
        db.query(func.count(ReminderJob.id))
        .filter(ReminderJob.org_id == org.id, ReminderJob.status == "pending")
        .scalar()
    ) or 0

    settings_row = db.query(OrgSettings).filter(OrgSettings.org_id == org.id).first()
    recent = (
        db.query(Invoice)
        .filter(Invoice.org_id == org.id)
        .order_by(Invoice.updated_at.desc())
        .limit(5)
        .all()
    )

    return {
        "org_name": org.name,
        "plan": org.plan,
        "operation_mode": settings_row.operation_mode if settings_row else None,
        "timezone": settings_row.timezone if settings_row else None,
        "paused": bool(settings_row.pause_all) if settings_row else False,
        "invoice_status_counts": status_counts,
        "overdue_count": len(overdue),
        "overdue_balance": overdue_amount,
        "pending_reminders": pending_jobs,
        "recent_invoices": [
            {
                "number": i.number,
                "status": i.status,
                "balance": float(i.balance or 0),
                "currency": i.currency,
                "due_date": i.due_date.isoformat() if i.due_date else None,
            }
            for i in recent
        ],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }

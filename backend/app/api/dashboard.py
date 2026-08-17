from datetime import datetime, timedelta, date, timezone
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.payout import Payout
from app.models.client import Client
from app.models.sequence import SequenceAssignment
from app.schemas.dashboard import (
    DashboardSummaryOut,
    DashboardActivity,
    DashboardChartsOut,
    ChartDataPoint,
    RecoveryByClientPoint,
    EscalationItem,
    RecentPaymentItem,
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


def _recommended_action(days_overdue: int, reminders_sent: int) -> str:
    if days_overdue >= 60:
        return "Escalate to manual follow-up"
    if days_overdue >= 30 and reminders_sent >= 3:
        return "Send firm reminder now"
    if reminders_sent == 0:
        return "Start reminder sequence"
    if days_overdue >= 14:
        return "Send next tone step"
    return "Monitor — next step on schedule"


@router.get("/summary", response_model=DashboardSummaryOut)
def get_dashboard_summary(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org

    total_outstanding = db.query(func.coalesce(func.sum(Invoice.balance), 0.0)).filter(
        Invoice.org_id == org.id, Invoice.status.notin_(["paid", "closed"])
    ).scalar()

    total_invoices_count = db.query(Invoice).filter(Invoice.org_id == org.id).count()

    thirty_days_ago = date.today() - timedelta(days=30)
    at_risk_count = (
        db.query(Invoice)
        .filter(
            Invoice.org_id == org.id,
            Invoice.status.in_(["unpaid", "chasing"]),
            Invoice.due_date.isnot(None),
            Invoice.due_date <= thirty_days_ago,
        )
        .count()
    )

    recent_sends_count = db.query(Message).filter(Message.org_id == org.id).count()

    seven_days = date.today() + timedelta(days=7)
    expected_collections_7d = float(
        db.query(func.coalesce(func.sum(Invoice.balance), 0.0))
        .filter(
            Invoice.org_id == org.id,
            Invoice.status.in_(["unpaid", "chasing"]),
            Invoice.due_date.isnot(None),
            Invoice.due_date <= seven_days,
        )
        .scalar()
        or 0
    )

    active_campaigns_count = (
        db.query(SequenceAssignment).filter(SequenceAssignment.status == "active").count()
    )
    # Scope to org via invoices
    active_campaigns_count = (
        db.query(SequenceAssignment)
        .join(Invoice, SequenceAssignment.invoice_id == Invoice.id)
        .filter(Invoice.org_id == org.id, SequenceAssignment.status == "active")
        .count()
    )

    recent_payments_count = (
        db.query(Payout)
        .filter(
            Payout.org_id == org.id,
            Payout.paid_at >= datetime.now(timezone.utc) - timedelta(days=7),
        )
        .count()
    )

    activities: List[DashboardActivity] = []
    messages = (
        db.query(Message, Client.name.label("client_name"), Invoice.number.label("invoice_number"))
        .join(Client, Message.client_id == Client.id)
        .join(Invoice, Message.invoice_id == Invoice.id)
        .filter(Message.org_id == org.id)
        .order_by(Message.created_at.desc())
        .limit(8)
        .all()
    )
    for msg, c_name, inv_num in messages:
        activities.append(
            DashboardActivity(
                id=f"msg_{msg.id}",
                type="send",
                title=f"Reminder sent to {c_name}",
                subtitle=f"Invoice #{inv_num} • {msg.subject[:40]}",
                timestamp=msg.created_at,
            )
        )

    payouts = (
        db.query(Payout, Invoice.number.label("invoice_number"), Client.name.label("client_name"))
        .join(Invoice, Payout.invoice_id == Invoice.id)
        .join(Client, Invoice.client_id == Client.id)
        .filter(Payout.org_id == org.id)
        .order_by(Payout.paid_at.desc())
        .limit(8)
        .all()
    )
    for payout, inv_num, c_name in payouts:
        activities.append(
            DashboardActivity(
                id=f"payout_{payout.id}",
                type="payment",
                title=f"Payment received from {c_name}",
                subtitle=f"Invoice #{inv_num}",
                amount=float(payout.amount),
                timestamp=payout.paid_at,
            )
        )

    activities.sort(key=lambda a: a.timestamp, reverse=True)

    return DashboardSummaryOut(
        total_outstanding=float(total_outstanding or 0),
        total_invoices_count=total_invoices_count,
        at_risk_count=at_risk_count,
        recent_sends_count=recent_sends_count,
        expected_collections_7d=expected_collections_7d,
        active_campaigns_count=active_campaigns_count,
        recent_payments_count=recent_payments_count,
        recent_activities=activities[:8],
    )


@router.get("/charts", response_model=DashboardChartsOut)
def get_dashboard_charts(
    range: str = Query("30d"),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    points: List[ChartDataPoint] = []
    today = date.today()
    days = 90 if range == "90d" else 30
    step = max(1, days // 12)

    for i in range(11, -1, -1):
        target_date = today - timedelta(days=i * step)
        date_str = target_date.strftime("%b %d")
        collected = (
            db.query(func.coalesce(func.sum(Payout.amount), 0.0))
            .filter(Payout.org_id == org.id, func.date(Payout.paid_at) <= target_date)
            .scalar()
        )
        outstanding = (
            db.query(func.coalesce(func.sum(Invoice.balance), 0.0))
            .filter(Invoice.org_id == org.id, Invoice.status.notin_(["paid", "closed"]))
            .scalar()
        )
        points.append(
            ChartDataPoint(
                date=date_str,
                collected=float(collected or 0),
                outstanding=float(outstanding or 0),
            )
        )

    # Recovery rate by client (paid / total invoices)
    recovery: List[RecoveryByClientPoint] = []
    clients = db.query(Client).filter(Client.org_id == org.id).limit(10).all()
    for c in clients:
        total = db.query(Invoice).filter(Invoice.client_id == c.id).count()
        if not total:
            continue
        paid = db.query(Invoice).filter(Invoice.client_id == c.id, Invoice.status == "paid").count()
        collected_amt = float(
            db.query(func.coalesce(func.sum(Payout.amount), 0.0))
            .join(Invoice, Payout.invoice_id == Invoice.id)
            .filter(Invoice.client_id == c.id)
            .scalar()
            or 0
        )
        recovery.append(
            RecoveryByClientPoint(
                client_name=c.name,
                recovery_rate=round(paid / total * 100, 1),
                collected=collected_amt,
            )
        )
    recovery.sort(key=lambda r: r.recovery_rate, reverse=True)

    return DashboardChartsOut(range=range, points=points, recovery_by_client=recovery[:8])


@router.get("/escalations", response_model=List[EscalationItem])
def get_escalations(
    min_days: int = Query(30),
    high_value: bool = Query(False),
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    cutoff = date.today() - timedelta(days=min_days)
    q = db.query(Invoice, Client).join(Client, Invoice.client_id == Client.id).filter(
        Invoice.org_id == org.id,
        Invoice.status.in_(["unpaid", "chasing"]),
        Invoice.due_date.isnot(None),
        Invoice.due_date <= cutoff,
    )
    if high_value:
        q = q.filter(Invoice.amount >= 1000)

    rows = q.order_by(Invoice.due_date.asc()).limit(50).all()
    items: List[EscalationItem] = []
    for inv, client in rows:
        days = (date.today() - inv.due_date).days
        msgs = (
            db.query(Message)
            .filter(Message.invoice_id == inv.id)
            .order_by(Message.created_at.desc())
            .all()
        )
        last = msgs[0] if msgs else None
        items.append(
            EscalationItem(
                invoice_id=inv.id,
                invoice_number=inv.number,
                client_id=client.id,
                client_name=client.name,
                amount=float(inv.amount),
                days_overdue=days,
                reminders_sent=len(msgs),
                last_sent_at=last.sent_at or last.created_at if last else None,
                last_response=last.status if last else None,
                recommended_action=_recommended_action(days, len(msgs)),
            )
        )
    return items


@router.get("/recent-payments", response_model=List[RecentPaymentItem])
def get_recent_payments(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, org = user_and_org
    rows = (
        db.query(Payout, Invoice, Client)
        .join(Invoice, Payout.invoice_id == Invoice.id)
        .join(Client, Invoice.client_id == Client.id)
        .filter(Payout.org_id == org.id)
        .order_by(Payout.paid_at.desc())
        .limit(10)
        .all()
    )
    return [
        RecentPaymentItem(
            invoice_id=inv.id,
            invoice_number=inv.number,
            client_name=client.name,
            amount=float(payout.amount),
            paid_at=payout.paid_at,
            method=getattr(payout, "method", None),
        )
        for payout, inv, client in rows
    ]


@router.get("/usage")
def get_usage(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)):
    from app.services.plan_gating import available_whatsapp_credits, normalize_plan

    _, org = user_and_org
    return {
        "plan": normalize_plan(org.plan),
        "collections_used": org.collections_used_this_period,
        "collections_quota": org.collections_quota,
        "whatsapp_used": org.whatsapp_used_this_period,
        "whatsapp_quota": org.whatsapp_quota,
        "whatsapp_credits": available_whatsapp_credits(db, org.id),
    }

"""Dashboard metrics and activity feed."""

from datetime import date, datetime, timedelta

from sqlalchemy import func
from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, ReminderMessage, SyncLog, UserNotification
from gentletap.services.analytics_data import build_mom_metrics
from gentletap.services.invoice_source import (
    attention_reason_label,
    invoice_needs_attention,
    invoice_source,
    invoice_source_label,
)
from gentletap.services.reminder_contacts import effective_reminder_email, reminder_contact_payload
from gentletap.services.plan_limits import month_start


def _relative_phrase(dt: datetime) -> str:
    now = datetime.now(dt.tzinfo) if dt.tzinfo else datetime.utcnow()
    diff_min = int((now - dt).total_seconds() / 60)
    if diff_min < 1:
        return "just now"
    if diff_min < 60:
        return f"{diff_min} min{'s' if diff_min != 1 else ''} ago"
    diff_hr = diff_min // 60
    if diff_hr < 24:
        return f"{diff_hr} hr{'s' if diff_hr != 1 else ''} ago"
    if diff_min < 48 * 60:
        return "today"
    return dt.strftime("%b %d")


def invoice_status_text(inv: Invoice) -> str:
    if float(inv.balance) <= 0 or inv.status == "paid":
        if inv.paid_at:
            paid_day = inv.paid_at.date() if hasattr(inv.paid_at, "date") else inv.paid_at
            if paid_day == date.today():
                return "Paid today"
        return "Paid"
    if inv.dispute_flag:
        return "Disputed"
    if inv.sequence_paused:
        return "Paused"
    if inv.days_overdue > 0:
        return f"{inv.days_overdue} day{'s' if inv.days_overdue != 1 else ''} overdue"
    if inv.due_date:
        days = (inv.due_date - date.today()).days
        if days == 0:
            return "Due today"
        if days > 0:
            return f"Due in {days} day{'s' if days != 1 else ''}"
    return "Current"


def invoice_meta_line(inv: Invoice, last_msg: ReminderMessage | None) -> str:
    doc = f"INV #{inv.doc_number or '—'}"
    if float(inv.balance) <= 0 or inv.status == "paid":
        return f"{doc} · Thank you sent automatically"
    if last_msg and last_msg.sent_at:
        when = _relative_phrase(last_msg.sent_at)
        if last_msg.tone in ("firm", "urgent"):
            return f"{doc} · Final notice sent {when}"
        channel = "WhatsApp" if last_msg.channel == "whatsapp" else "Email"
        return f"{doc} · {channel} sent {when}"
    if inv.sequence_active:
        if inv.sequence_step > 0:
            return f"{doc} · Reminder scheduled"
        return f"{doc} · First reminder sending soon"
    if inv.days_overdue > 0:
        return f"{doc} · Queued for reminders"
    if inv.due_date:
        days = (inv.due_date - date.today()).days
        if days > 0:
            return f"{doc} · Reminder scheduled in {days} day{'s' if days != 1 else ''}"
    return doc


def invoice_chase_label(inv: Invoice) -> str:
    if float(inv.balance) <= 0 or inv.status == "paid":
        return "paid"
    if inv.dispute_flag:
        return "disputed"
    if inv.sequence_paused:
        return "paused"
    if inv.sequence_active:
        if inv.sequence_step >= 4:
            return "final_notice"
        return "chasing"
    if inv.days_overdue > 0:
        return "queued"
    return "upcoming"


def last_sent_reminders_by_invoice(db: Session, invoice_ids: list) -> dict:
    if not invoice_ids:
        return {}
    rows = (
        db.query(ReminderMessage)
        .filter(
            ReminderMessage.invoice_id.in_(invoice_ids),
            ReminderMessage.status == "sent",
            ReminderMessage.sent_at.isnot(None),
        )
        .distinct(ReminderMessage.invoice_id)
        .order_by(ReminderMessage.invoice_id, ReminderMessage.sent_at.desc())
        .all()
    )
    return {msg.invoice_id: msg for msg in rows}


def enrich_invoice_row(inv: Invoice, last_msg: ReminderMessage | None) -> dict:
    source = invoice_source(inv)
    needs_attention, attention_reason = invoice_needs_attention(inv)
    return {
        "id": str(inv.id),
        "doc_number": inv.doc_number,
        "client_name": inv.client.name if inv.client else "",
        "client_email": effective_reminder_email(inv),
        "client_phone": inv.client.phone if inv.client else None,
        "amount": float(inv.amount),
        "balance": float(inv.balance),
        "currency": inv.currency,
        "days_overdue": inv.days_overdue,
        "status": inv.status,
        "sequence_active": inv.sequence_active,
        "sequence_paused": inv.sequence_paused,
        "sequence_step": inv.sequence_step,
        "dispute_flag": inv.dispute_flag,
        "due_date": inv.due_date.isoformat() if inv.due_date else None,
        "payment_link": inv.payment_link,
        "source": source,
        "source_label": invoice_source_label(source),
        "needs_attention": needs_attention,
        "attention_reason": attention_reason,
        "attention_label": attention_reason_label(attention_reason),
        "imported_at": inv.imported_at.isoformat() if inv.imported_at else None,
        "last_manual_update_at": inv.last_manual_update_at.isoformat() if inv.last_manual_update_at else None,
        "chase_label": invoice_chase_label(inv),
        "status_text": invoice_status_text(inv),
        "meta_line": invoice_meta_line(inv, last_msg),
        "last_reminder_at": last_msg.sent_at.isoformat() if last_msg and last_msg.sent_at else None,
        "last_reminder_channel": last_msg.channel if last_msg else None,
        **reminder_contact_payload(inv),
    }


def featured_escalation(db: Session, user_id) -> dict | None:
    inv = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user_id,
            Invoice.balance > 0,
            Invoice.sequence_active.is_(True),
            Invoice.sequence_step >= 3,
        )
        .order_by(Invoice.days_overdue.desc())
        .first()
    )
    if inv is None:
        return None
    sent_count = (
        db.query(func.count(ReminderMessage.id))
        .filter(
            ReminderMessage.invoice_id == inv.id,
            ReminderMessage.status == "sent",
        )
        .scalar()
        or 0
    )
    if sent_count < 3:
        return None
    client = inv.client.name if inv.client else "Client"
    return {
        "invoice_id": str(inv.id),
        "client_name": client,
        "balance": float(inv.balance),
        "currency": inv.currency,
        "reminders_sent": sent_count,
        "days_overdue": inv.days_overdue,
        "message": (
            f"{client} ({inv.currency} {float(inv.balance):,.0f}) — GentleTap has sent "
            f"{sent_count} reminders with no response. We've sent a firm final notice today. "
            f"If no payment in 5 days, we'll notify you to consider a payment plan."
        ),
    }


def build_summary_extras(db: Session, user_id) -> dict:
    start = month_start()
    today = date.today()
    week_end = today + timedelta(days=7)

    collected_this_month = (
        db.query(func.coalesce(func.sum(Invoice.amount), 0))
        .filter(
            Invoice.user_id == user_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= start,
        )
        .scalar()
        or 0
    )

    paid_count_month = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.user_id == user_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= start,
        )
        .scalar()
        or 0
    )

    expected_this_week = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(
            Invoice.user_id == user_id,
            Invoice.balance > 0,
            Invoice.due_date.isnot(None),
            Invoice.due_date >= today,
            Invoice.due_date <= week_end,
        )
        .scalar()
        or 0
    )

    expected_count = (
        db.query(func.count(Invoice.id))
        .filter(
            Invoice.user_id == user_id,
            Invoice.balance > 0,
            Invoice.due_date.isnot(None),
            Invoice.due_date >= today,
            Invoice.due_date <= week_end,
        )
        .scalar()
        or 0
    )

    avg_days = (
        db.query(func.avg(Client.avg_days_to_pay))
        .filter(Client.user_id == user_id, Client.avg_days_to_pay.isnot(None))
        .scalar()
    )

    reminders_sent_month = (
        db.query(func.count(ReminderMessage.id))
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .filter(
            Invoice.user_id == user_id,
            ReminderMessage.status == "sent",
            ReminderMessage.sent_at >= start,
        )
        .scalar()
        or 0
    )

    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .scalar()
        or 0
    )

    collected_f = float(collected_this_month)
    outstanding_f = float(total_outstanding)
    total_pool = collected_f + outstanding_f
    collection_rate = round((collected_f / total_pool) * 100) if total_pool > 0 else 0

    response_rate = (
        round((paid_count_month / reminders_sent_month) * 100) if reminders_sent_month > 0 else None
    )

    time_saved_hours = round(reminders_sent_month * 0.25, 1)
    time_saved_value = round(time_saved_hours * 100)

    last_row = (
        db.query(ReminderMessage, Invoice)
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .filter(
            Invoice.user_id == user_id,
            ReminderMessage.status == "sent",
            ReminderMessage.sent_at.isnot(None),
        )
        .order_by(ReminderMessage.sent_at.desc())
        .first()
    )

    last_action = None
    if last_row:
        msg, inv = last_row
        last_action = {
            "channel": msg.channel,
            "client_name": inv.client.name if inv.client else "",
            "doc_number": inv.doc_number,
            "sent_at": msg.sent_at.isoformat() if msg.sent_at else None,
        }

    return {
        "collected_this_month": collected_f,
        "expected_this_week": float(expected_this_week),
        "expected_this_week_count": expected_count,
        "avg_days_to_pay": round(float(avg_days), 1) if avg_days is not None else None,
        "reminders_sent_this_month": reminders_sent_month,
        "collection_rate": collection_rate,
        "response_rate": response_rate,
        "time_saved_hours": time_saved_hours,
        "time_saved_value": time_saved_value,
        "last_action": last_action,
        "featured_escalation": featured_escalation(db, user_id),
        **build_mom_metrics(db, user_id),
    }


def build_activity_feed(db: Session, user_id, limit: int = 10) -> list[dict]:
    items: list[dict] = []

    sent_rows = (
        db.query(ReminderMessage, Invoice)
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .filter(
            Invoice.user_id == user_id,
            ReminderMessage.status == "sent",
            ReminderMessage.sent_at.isnot(None),
        )
        .order_by(ReminderMessage.sent_at.desc())
        .limit(limit)
        .all()
    )
    for msg, inv in sent_rows:
        client = inv.client.name if inv.client else "Client"
        doc = inv.doc_number or "—"
        if msg.tone in ("firm", "urgent"):
            text = f"Firm final notice sent to {client} for INV #{doc}"
            channel = "email"
        elif msg.channel == "whatsapp":
            text = f"WhatsApp sent to {client} for INV #{doc}"
            channel = "whatsapp"
        else:
            text = f"Gentle reminder sent to {client} for INV #{doc}"
            channel = "email"
        items.append(
            {
                "kind": "reminder_sent",
                "channel": channel,
                "title": text,
                "subtitle": None,
                "amount": float(inv.balance),
                "at": msg.sent_at.isoformat() if msg.sent_at else "",
                "invoice_id": str(inv.id),
            }
        )

    paid_rows = (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user_id,
            Invoice.paid_at.isnot(None),
            Invoice.paid_at >= month_start(),
        )
        .order_by(Invoice.paid_at.desc())
        .limit(5)
        .all()
    )
    for inv in paid_rows:
        client = inv.client.name if inv.client else "Client"
        items.append(
            {
                "kind": "payment",
                "channel": None,
                "title": f"{client} paid {inv.currency} {float(inv.amount):,.2f} — all reminders stopped automatically",
                "subtitle": None,
                "amount": float(inv.amount),
                "at": inv.paid_at.isoformat() if inv.paid_at else "",
                "invoice_id": str(inv.id),
            }
        )

    sync_row = (
        db.query(SyncLog)
        .filter(SyncLog.user_id == user_id, SyncLog.status == "success")
        .order_by(SyncLog.created_at.desc())
        .first()
    )
    if sync_row and sync_row.invoices_synced and sync_row.invoices_synced > 0:
        items.append(
            {
                "kind": "sync",
                "channel": None,
                "title": f"QuickBooks synced — {sync_row.invoices_synced} new invoice{'s' if sync_row.invoices_synced != 1 else ''} added to autopilot",
                "subtitle": sync_row.message,
                "amount": None,
                "at": sync_row.created_at.isoformat() if sync_row.created_at else "",
                "invoice_id": None,
            }
        )

    notif_rows = (
        db.query(UserNotification)
        .filter(
            UserNotification.user_id == user_id,
            UserNotification.kind == "auto_activated",
        )
        .order_by(UserNotification.created_at.desc())
        .limit(3)
        .all()
    )
    for n in notif_rows:
        items.append(
            {
                "kind": "auto_activated",
                "channel": None,
                "title": n.title,
                "subtitle": n.body,
                "amount": None,
                "at": n.created_at.isoformat() if n.created_at else "",
                "invoice_id": str(n.invoice_id) if n.invoice_id else None,
            }
        )

    items.sort(key=lambda x: x["at"], reverse=True)
    return items[:limit]


def build_invoices_summary(db: Session, user_id) -> dict:
    from gentletap.services.invoice_source import source_counts_for_user
    from gentletap.services.plan_limits import free_plan_collection_usage

    unpaid_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    overdue_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.balance > 0, Invoice.days_overdue > 0)
        .scalar()
        or 0
    )
    green_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.balance > 0, Invoice.status == "green")
        .scalar()
        or 0
    )
    yellow_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.balance > 0, Invoice.status == "yellow")
        .scalar()
        or 0
    )
    red_count = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.balance > 0, Invoice.status == "red")
        .scalar()
        or 0
    )
    active_sequences = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user_id, Invoice.sequence_active.is_(True))
        .scalar()
        or 0
    )
    total_outstanding = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    currency_row = (
        db.query(Invoice.currency)
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .first()
    )

    def _bucket(min_days: int, max_days: int | None) -> dict:
        q = db.query(
            func.count(Invoice.id),
            func.coalesce(func.sum(Invoice.balance), 0),
        ).filter(Invoice.user_id == user_id, Invoice.balance > 0, Invoice.days_overdue >= min_days)
        if max_days is not None:
            q = q.filter(Invoice.days_overdue <= max_days)
        row = q.first()
        return {"count": row[0] or 0, "total": float(row[1] or 0)}

    extras = build_summary_extras(db, user_id)
    overdue_stats = (
        db.query(
            func.coalesce(func.max(Invoice.days_overdue), 0),
            func.coalesce(func.avg(Invoice.days_overdue), 0),
        )
        .filter(Invoice.user_id == user_id, Invoice.balance > 0, Invoice.days_overdue > 0)
        .one()
    )
    return {
        "unpaid_count": unpaid_count,
        "overdue_count": overdue_count,
        "total_outstanding": float(total_outstanding),
        "oldest_days_overdue": int(overdue_stats[0] or 0),
        "avg_days_overdue": int(round(float(overdue_stats[1] or 0))),
        "currency": currency_row[0] if currency_row else "USD",
        "green_count": green_count,
        "yellow_count": yellow_count,
        "red_count": red_count,
        "active_sequences": active_sequences,
        "monthly_collections": free_plan_collection_usage(db, user_id),
        "aging": {
            "current": _bucket(0, 0),
            "days_1_30": _bucket(1, 30),
            "days_31_60": _bucket(31, 60),
            "days_61_90": _bucket(61, 90),
            "days_90_plus": _bucket(91, None),
        },
        **extras,
        "activity": build_activity_feed(db, user_id, limit=10),
        "sources": source_counts_for_user(db, user_id),
    }

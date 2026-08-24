"""Builds an intelligence ReminderContext from the new project's models."""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session

from app.intelligence.schemas import ClientProfile as CtxClientProfile
from app.intelligence.schemas import InvoiceContext, ReminderContext
from app.models.client import Client
from app.models.client_profile import ClientProfile
from app.models.invoice import Invoice
from app.models.org_settings import OrgSettings
from app.models.organization import Organization
from app.models.suppression import Suppression


def _compute_days_overdue(inv: Invoice) -> int:
    if not inv.due_date:
        return 0
    from datetime import date

    return (date.today() - inv.due_date).days


def _client_responded_recently(db: Session, org_id: str, client_id: str, days: int = 3) -> bool:
    """True when the client replied on any channel within the window."""
    from datetime import datetime, timedelta, timezone

    since = datetime.now(timezone.utc) - timedelta(days=days)

    from app.models.message import Message
    from app.models.whatsapp_inbound import WhatsappInboundMessage

    replied_outbound = (
        db.query(Message.id)
        .filter(
            Message.org_id == org_id,
            Message.client_id == client_id,
            Message.status == "replied",
            Message.created_at >= since - timedelta(days=14),
        )
        .first()
    )
    if replied_outbound is not None:
        return True

    inbound = (
        db.query(WhatsappInboundMessage.id)
        .filter(
            WhatsappInboundMessage.org_id == org_id,
            WhatsappInboundMessage.client_id == client_id,
            WhatsappInboundMessage.opt_out.is_(False),
            WhatsappInboundMessage.received_at >= since,
        )
        .first()
    )
    return inbound is not None


def _sequence_paused_for_invoice(db: Session, invoice_id: str) -> bool:
    from app.models.sequence import SequenceAssignment

    row = (
        db.query(SequenceAssignment)
        .filter(
            SequenceAssignment.invoice_id == invoice_id,
            SequenceAssignment.status == "paused",
        )
        .first()
    )
    return row is not None


def build_reminder_context(
    db: Session,
    invoice: Invoice,
    org: Organization,
    *,
    sequence_step: Optional[int] = None,
) -> ReminderContext | None:
    client = db.query(Client).filter(Client.id == invoice.client_id).first()
    if client is None:
        return None

    profile_row = (
        db.query(ClientProfile).filter(ClientProfile.client_id == client.id).one_or_none()
    )
    history = (profile_row.history or {}) if profile_row else {}

    settings_row = (
        db.query(OrgSettings).filter(OrgSettings.org_id == org.id).one_or_none()
    )

    email_suppressed = False
    if client.email:
        email_suppressed = (
            db.query(Suppression)
            .filter(Suppression.org_id == org.id, Suppression.email_or_phone == client.email)
            .one_or_none()
        ) is not None

    owner_name = (org.name or "GentleTap user").strip()

    ctx_invoice = InvoiceContext(
        invoice_id=str(invoice.id),
        doc_number=invoice.number,
        amount=float(invoice.amount or 0),
        balance=float(invoice.balance or 0),
        currency=invoice.currency or "USD",
        days_overdue=_compute_days_overdue(invoice),
        due_date=invoice.due_date,
        sequence_step=sequence_step if sequence_step is not None else 0,
        client_responded_recently=_client_responded_recently(
            db, org.id, str(client.id)
        ),
        dispute_flag=(invoice.status == "disputed"),
        sequence_paused=invoice.stop_reminders
        or _sequence_paused_for_invoice(db, str(invoice.id)),
        approved=True,
        payment_link=None,
    )

    ctx_profile = CtxClientProfile(
        avg_days_to_pay=float(profile_row.avg_days_to_pay or 0) if profile_row else None,
        late_payment_rate=float(history.get("late_payment_rate", 0.0)),
        invoices_paid_on_time=int((profile_row.total_paid or 0) - (profile_row.late_count or 0)) if profile_row else 0,
        invoices_paid_late=int(profile_row.late_count or 0) if profile_row else 0,
        lifetime_value=float(history.get("lifetime_value", 0.0)),
        tenure_months=int(history.get("tenure_months", 0)),
        communication_style="unknown",
        risk_level=history.get("risk_level", "medium"),
        preferred_channel="email",
    )

    return ReminderContext(
        client_id=str(client.id),
        client_name=client.name or "there",
        client_email=client.email,
        client_phone=client.phone,
        email_suppressed=email_suppressed,
        user_plan=org.plan or "starter",
        sender_name=owner_name,
        business_timezone=(settings_row.timezone if settings_row else None) or "America/New_York",
        invoice=ctx_invoice,
        profile=ctx_profile,
        prior_messages_count=0,
    )

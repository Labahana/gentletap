"""Build ReminderContext from database rows."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import Client, Invoice, Profile
from gentletap.intelligence.schemas import ClientProfile, InvoiceContext, ReminderContext, RiskLevel


def _client_responded_recently(invoice: Invoice) -> bool:
    if invoice.client_responded_at is None:
        return False
    responded = invoice.client_responded_at
    if responded.tzinfo is None:
        responded = responded.replace(tzinfo=UTC)
    return responded >= datetime.now(UTC) - timedelta(hours=48)


def client_profile_from_row(client: Client) -> ClientProfile:
    risk_map = {
        "low": RiskLevel.LOW,
        "medium": RiskLevel.MEDIUM,
        "high": RiskLevel.HIGH,
    }
    return ClientProfile(
        avg_days_to_pay=float(client.avg_days_to_pay) if client.avg_days_to_pay is not None else None,
        late_payment_rate=float(client.late_payment_rate or 0),
        invoices_paid_on_time=client.invoices_paid_on_time,
        invoices_paid_late=client.invoices_paid_late,
        lifetime_value=float(client.lifetime_value or 0),
        tenure_months=client.tenure_months,
        communication_style=client.communication_style,
        risk_level=risk_map.get(client.risk_level, RiskLevel.MEDIUM),
        preferred_channel=client.preferred_channel or "email",
    )


def invoice_context_from_row(invoice: Invoice) -> InvoiceContext:
    due = invoice.due_date
    due_dt = datetime.combine(due, datetime.min.time(), tzinfo=UTC) if due else datetime.now(UTC)
    return InvoiceContext(
        invoice_id=str(invoice.id),
        doc_number=invoice.doc_number or str(invoice.qb_invoice_id),
        amount=float(invoice.amount),
        balance=float(invoice.balance),
        currency=invoice.currency,
        days_overdue=invoice.days_overdue,
        due_date=due_dt,
        sequence_step=invoice.sequence_step,
        client_responded_recently=_client_responded_recently(invoice),
        dispute_flag=invoice.dispute_flag,
        sequence_paused=invoice.sequence_paused,
        approved=invoice.sequence_approved,
    )


def build_reminder_context(db: Session, invoice_id: UUID, user_id: UUID) -> ReminderContext | None:
    invoice = (
        db.query(Invoice)
        .filter(Invoice.id == invoice_id, Invoice.user_id == user_id)
        .one_or_none()
    )
    if invoice is None:
        return None
    client = db.query(Client).filter(Client.id == invoice.client_id).one()
    user = db.query(Profile).filter(Profile.id == user_id).one()
    sender_name = (
        user.email_display_name or user.full_name or user.email.split("@")[0]
    ).strip()
    return ReminderContext(
        client_id=str(client.id),
        client_name=client.name,
        client_email=client.email,
        client_phone=client.phone,
        email_suppressed=bool(client.email_suppressed),
        user_plan=user.plan,
        sender_name=sender_name,
        profile=client_profile_from_row(client),
        invoice=invoice_context_from_row(invoice),
    )

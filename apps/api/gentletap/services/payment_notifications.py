"""Email the account owner when a synced accounting invoice is paid."""

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Invoice, Profile, UserNotification
from gentletap.services.email_templates import (
    PaymentFailedEmailData,
    PaymentReceivedEmailData,
    render_payment_failed_bodies,
    render_payment_received_bodies,
)
from gentletap.services.invoice_source import invoice_source
from gentletap.services.platform_email import send_platform_email

_SYNCED_SOURCES = frozenset({"quickbooks", "freshbooks"})


def send_qb_payment_received_email(db: Session, user: Profile, invoice: Invoice, *, amount: float) -> bool:
    """Notify the freelancer by email when a synced invoice is fully paid."""
    if invoice_source(invoice) not in _SYNCED_SOURCES:
        return False

    settings = get_settings()
    doc = (invoice.doc_number or invoice.qb_invoice_id or "invoice").strip()
    client_name = invoice.client.name if invoice.client else "Your client"
    dashboard_url = f"{settings.web_url.rstrip('/')}/dashboard/invoices/{invoice.id}"

    plain, html = render_payment_received_bodies(
        PaymentReceivedEmailData(
            doc_number=doc,
            amount=amount,
            currency=invoice.currency or "USD",
            client_name=client_name,
            dashboard_url=dashboard_url,
        )
    )
    return send_platform_email(
        to=user.email,
        subject=f"Payment received — invoice #{doc}",
        plain=plain,
        html=html,
    )


_DUNNING_RESEND_COOLDOWN = timedelta(hours=24)


def send_dunning_email(
    db: Session, user: Profile, *, amount: float = 0.0, currency: str = "USD"
) -> bool:
    """Notify the account owner that a subscription payment failed (dunning).

    Rate-limited to once per 24h so Paddle's automatic retries don't spam them.
    """
    now = datetime.now(UTC)
    last = user.dunning_notified_at
    if last is not None:
        if last.tzinfo is None:
            last = last.replace(tzinfo=UTC)
        if now - last < _DUNNING_RESEND_COOLDOWN:
            return False

    settings = get_settings()
    billing_url = f"{settings.web_url.rstrip('/')}/settings/billing"
    plain, html = render_payment_failed_bodies(
        PaymentFailedEmailData(
            full_name=user.full_name or "",
            amount=amount,
            currency=currency or "USD",
            billing_url=billing_url,
        )
    )
    sent = send_platform_email(
        to=user.email,
        subject="Action needed: your GentleTap payment failed",
        plain=plain,
        html=html,
    )
    user.dunning_notified_at = now
    db.add(
        UserNotification(
            user_id=user.id,
            kind="payment_failed",
            title="Payment failed",
            body="We couldn't process your subscription payment. Update your payment method to avoid interruption.",
        )
    )
    return sent

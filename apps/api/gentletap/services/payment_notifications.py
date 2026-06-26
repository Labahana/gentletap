"""Email the account owner when a QuickBooks invoice is paid."""

from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Invoice, Profile
from gentletap.services.email_templates import PaymentReceivedEmailData, render_payment_received_bodies
from gentletap.services.invoice_source import invoice_source
from gentletap.services.platform_email import send_platform_email


def send_qb_payment_received_email(db: Session, user: Profile, invoice: Invoice, *, amount: float) -> bool:
    """Notify the freelancer by email when a QuickBooks invoice is fully paid."""
    if invoice_source(invoice) != "quickbooks":
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

from gentletap.integrations.quickbooks.invoice_fields import payment_link_from_qb
from gentletap.intelligence.message_generator import _fallback_message
from gentletap.intelligence.schemas import ClientProfile, InvoiceContext, ReminderContext, Tone
from datetime import UTC, datetime


def test_payment_link_from_qb_valid():
    url = "https://connect.intuit.com/portal/app/CommerceNetwork/view/prgm/invoice/123"
    assert payment_link_from_qb({"InvoiceLink": url}) == url


def test_payment_link_from_qb_trims_and_rejects_invalid():
    assert payment_link_from_qb({"InvoiceLink": "  https://example.com/pay  "}) == "https://example.com/pay"
    assert payment_link_from_qb({"InvoiceLink": "not-a-url"}) is None
    assert payment_link_from_qb({}) is None
    assert payment_link_from_qb({"InvoiceLink": None}) is None


def test_fallback_message_includes_payment_link():
    ctx = ReminderContext(
        client_id="c1",
        client_name="Sarah",
        client_email="sarah@example.com",
        profile=ClientProfile(),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="1042",
            amount=4200,
            balance=4200,
            days_overdue=5,
            due_date=datetime.now(UTC),
            approved=True,
            payment_link="https://connect.intuit.com/pay/1042",
        ),
    )
    msg = _fallback_message(ctx, Tone.FRIENDLY)
    assert "https://connect.intuit.com/pay/1042" in msg.body
    assert "Pay online:" in msg.body


def test_fallback_message_without_payment_link():
    ctx = ReminderContext(
        client_id="c1",
        client_name="Sarah",
        client_email="sarah@example.com",
        profile=ClientProfile(),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="1042",
            amount=4200,
            balance=4200,
            days_overdue=5,
            due_date=datetime.now(UTC),
            approved=True,
        ),
    )
    msg = _fallback_message(ctx, Tone.FRIENDLY)
    assert "Pay online:" not in msg.body

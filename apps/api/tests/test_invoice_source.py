from gentletap.database import Invoice
from gentletap.services.invoice_source import (
    invoice_needs_attention,
    invoice_source,
)


def _invoice(**kwargs) -> Invoice:
    inv = Invoice(
        user_id=kwargs.get("user_id"),
        client_id=kwargs.get("client_id"),
        qb_invoice_id=kwargs.get("qb_invoice_id", "1001"),
        amount=kwargs.get("amount", 100),
        balance=kwargs.get("balance", 100),
    )
    for key, value in kwargs.items():
        setattr(inv, key, value)
    return inv


def test_invoice_source_quickbooks():
    assert invoice_source(_invoice(qb_invoice_id="1042")) == "quickbooks"


def test_invoice_source_upload():
    assert invoice_source(_invoice(qb_invoice_id="csv:INV-12")) == "upload"


def test_upload_needs_attention_when_overdue_not_active():
    inv = _invoice(
        qb_invoice_id="csv:x",
        balance=50,
        days_overdue=5,
        sequence_active=False,
        dispute_flag=False,
        sequence_paused=False,
    )
    needs, reason = invoice_needs_attention(inv)
    assert needs is True
    assert reason == "not_on_autopilot"


def test_quickbooks_never_needs_attention():
    inv = _invoice(qb_invoice_id="99", balance=50, days_overdue=10, sequence_active=False)
    assert invoice_needs_attention(inv) == (False, None)

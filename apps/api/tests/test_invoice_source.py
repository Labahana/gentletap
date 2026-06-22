from gentletap.database import Invoice
from gentletap.services.invoice_source import (
    invoice_needs_attention,
    invoice_source,
    source_counts_for_user,
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


def test_source_counts():
    class FakeQuery:
        def __init__(self, rows):
            self._rows = rows

        def filter(self, *args, **kwargs):
            return self

        def all(self):
            return self._rows

    class FakeDb:
        def __init__(self, rows):
            self._rows = rows

        def query(self, model):
            return FakeQuery(self._rows)

    rows = [
        _invoice(qb_invoice_id="1", balance=10),
        _invoice(qb_invoice_id="csv:a", balance=20, days_overdue=3, sequence_active=False),
        _invoice(qb_invoice_id="csv:b", balance=0),
    ]
    counts = source_counts_for_user(FakeDb(rows), user_id=None)
    assert counts["quickbooks_count"] == 1
    assert counts["upload_count"] == 1
    assert counts["upload_needs_attention"] == 1

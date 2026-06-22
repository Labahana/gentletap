from datetime import date
from decimal import Decimal
from uuid import uuid4

import pytest
from fastapi import HTTPException

from gentletap.database import Invoice
from gentletap.services.manual_invoices import mark_upload_invoice_paid, require_upload_invoice, update_upload_invoice


def _upload_invoice(**kwargs) -> Invoice:
    inv = Invoice(
        id=uuid4(),
        user_id=uuid4(),
        client_id=uuid4(),
        qb_invoice_id=kwargs.get("qb_invoice_id", "csv:100"),
        source="upload",
        amount=kwargs.get("amount", 100),
        balance=kwargs.get("balance", 100),
        due_date=kwargs.get("due_date", date(2026, 1, 1)),
    )
    for key, value in kwargs.items():
        setattr(inv, key, value)
    return inv


def test_require_upload_rejects_quickbooks():
    inv = _upload_invoice(qb_invoice_id="99", source="quickbooks")
    with pytest.raises(HTTPException) as exc:
        require_upload_invoice(inv)
    assert exc.value.status_code == 400


def test_update_upload_balance_and_payment_link():
    class FakeDb:
        def commit(self):
            pass

        def refresh(self, obj):
            pass

    inv = _upload_invoice(balance=Decimal("250"))
    db = FakeDb()
    updated = update_upload_invoice(
        db,
        inv,
        balance=Decimal("175.50"),
        payment_link="https://pay.example.com/inv-1",
    )
    assert float(updated.balance) == 175.5
    assert updated.payment_link == "https://pay.example.com/inv-1"


def test_update_upload_invalid_payment_link():
    inv = _upload_invoice()
    with pytest.raises(HTTPException):
        update_upload_invoice(object(), inv, payment_link="not-a-url")

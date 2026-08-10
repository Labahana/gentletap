from decimal import Decimal
from unittest.mock import MagicMock, patch
from uuid import uuid4

from gentletap.database import Invoice, Profile
from gentletap.services.invoice_source import invoice_source
from gentletap.services.payment_notifications import send_qb_payment_received_email
from gentletap.services.payments import apply_invoice_balance_update


def _invoice(*, source="quickbooks", qb_id="qb-1", balance=100.0, doc="1042"):
    client = MagicMock()
    client.name = "Acme Ltd"
    inv = MagicMock()
    inv.id = uuid4()
    inv.source = source
    inv.qb_invoice_id = qb_id
    inv.doc_number = doc
    inv.balance = balance
    inv.currency = "USD"
    inv.client = client
    return inv


def test_send_qb_payment_received_email_skips_uploads():
    user = MagicMock()
    user.email = "owner@example.com"
    inv = _invoice(source="upload", qb_id="csv:row-1")

    with patch("gentletap.services.payment_notifications.send_platform_email") as send:
        assert send_qb_payment_received_email(MagicMock(), user, inv, amount=100.0) is False
        send.assert_not_called()


def test_send_qb_payment_received_email_sends_for_quickbooks():
    user = MagicMock()
    user.email = "owner@example.com"
    inv = _invoice()

    with patch("gentletap.services.payment_notifications.send_platform_email", return_value=True) as send:
        assert send_qb_payment_received_email(MagicMock(), user, inv, amount=250.0) is True
        send.assert_called_once()
        kwargs = send.call_args.kwargs
        assert kwargs["to"] == "owner@example.com"
        assert "1042" in kwargs["subject"]
        assert "Acme Ltd paid invoice #1042" in kwargs["plain"]


@patch("gentletap.services.payments.send_qb_payment_received_email")
def test_apply_invoice_balance_update_emails_on_qb_paid(mock_send_email):
    user_id = uuid4()
    invoice = _invoice(balance=Decimal("150.00"))
    user = MagicMock()
    user.id = user_id

    def query_side_effect(model):
        q = MagicMock()
        if model is Invoice:
            q.with_for_update.return_value = q
            q.filter.return_value.one_or_none.return_value = invoice
        elif model is Profile:
            q.filter.return_value.one.return_value = user
        return q

    db = MagicMock()
    db.query.side_effect = query_side_effect

    apply_invoice_balance_update(
        db,
        user_id=user_id,
        qb_invoice_id="qb-1",
        balance=Decimal("0"),
        notify=True,
    )

    mock_send_email.assert_called_once()
    assert mock_send_email.call_args.kwargs["amount"] == 150.0
    assert invoice_source(invoice) == "quickbooks"

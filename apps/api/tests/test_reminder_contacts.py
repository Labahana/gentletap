from types import SimpleNamespace

from gentletap.services.reminder_contacts import (
    effective_reminder_phone,
    reminder_contact_payload,
)


def test_effective_reminder_phone_ignores_client_phone():
    client = SimpleNamespace(phone="+15551111111")
    inv = SimpleNamespace(reminder_phone=None, client=client)
    assert effective_reminder_phone(inv) is None


def test_effective_reminder_phone_uses_invoice_only():
    client = SimpleNamespace(phone="+15551111111")
    inv = SimpleNamespace(reminder_phone="+15552222222", client=client)
    assert effective_reminder_phone(inv) == "+15552222222"


def test_reminder_contact_payload_missing():
    inv = SimpleNamespace(reminder_phone=None, client=SimpleNamespace(phone=None))
    payload = reminder_contact_payload(inv)
    assert payload["whatsapp_phone_missing"] is True
    assert payload["effective_reminder_phone"] is None

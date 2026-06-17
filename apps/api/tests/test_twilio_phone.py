from gentletap.integrations.twilio.phone import normalize_phone_e164, phones_match


def test_normalize_phone():
    assert normalize_phone_e164("whatsapp:+15551234567") == "+15551234567"
    assert normalize_phone_e164("15551234567") == "+15551234567"


def test_phones_match():
    assert phones_match("+15551234567", "whatsapp:+15551234567")
    assert phones_match("15551234567", "+15551234567")
    assert not phones_match("+15551234567", "+15559876543")

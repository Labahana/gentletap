from gentletap.integrations.resend.webhooks import _recipient_emails


def test_recipient_emails_from_list():
    assert _recipient_emails({"to": ["A@Example.com", "b@test.com"]}) == [
        "a@example.com",
        "b@test.com",
    ]


def test_recipient_emails_from_string():
    assert _recipient_emails({"to": "User@Example.com"}) == ["user@example.com"]

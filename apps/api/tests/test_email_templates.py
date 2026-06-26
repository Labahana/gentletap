from gentletap.services.email_templates import (
    AuthEmailData,
    PaymentReceivedEmailData,
    ReminderEmailData,
    build_reminder_bodies,
    clean_message_body,
    format_currency,
    render_password_reset_bodies,
    render_payment_received_bodies,
    render_reminder_html,
)


def test_format_currency_symbols():
    assert format_currency(468800, "NGN") == "₦468,800.00"
    assert format_currency(156.5, "USD") == "$156.50"


def test_clean_message_body_strips_pay_link_and_signoff():
    body = (
        "Hi Sarah,\n\nPlease pay when you can.\n\n"
        "Pay online: https://pay.example.com/inv/1\n\n"
        "Best regards,\nAcme Design Co"
    )
    cleaned = clean_message_body(body, business_name="Acme Design Co")
    assert "Pay online" not in cleaned
    assert "Best regards" not in cleaned
    assert "Please pay when you can." in cleaned


def test_render_reminder_html_compact_card():
    data = ReminderEmailData(
        doc_number="1042",
        balance=468800,
        currency="NGN",
        client_name="Yusuf",
        business_name="Gentletap",
        contact_email="hello@gentletap.co",
        contact_phone="+2348082806964",
        payment_link="https://pay.example.com/1042",
    )
    plain, html_doc = build_reminder_bodies(data, "Hi Yusuf,\n\nJust a quick reminder on this invoice.")
    assert "Invoice #1042 · Balance due" in plain
    assert "₦468,800.00" in plain
    assert "View invoice: https://pay.example.com/1042" in plain
    assert "Gentletap" in plain

    assert "max-width:480px" in html_doc
    assert "View invoice</a>" in html_doc
    assert "₦468,800.00" in html_doc
    assert "Just a quick reminder" in html_doc
    assert "48px" not in html_doc  # no oversized hero typography


def test_render_reminder_html_hides_cta_without_payment_link():
    data = ReminderEmailData(
        doc_number="99",
        balance=100,
        currency="USD",
        client_name="Client",
        business_name="Studio",
    )
    html_doc = render_reminder_html(data, "Hello there.")
    assert "View invoice" not in html_doc


def test_render_password_reset_bodies():
    plain, html_doc = render_password_reset_bodies(
        AuthEmailData(
            greeting="Hi Yusuf,",
            message="We received a request to reset your GentleTap password.",
            cta_label="Reset password",
            cta_url="https://gentletap.co/reset-password?token=abc",
        )
    )
    assert "Reset password: https://gentletap.co/reset-password?token=abc" in plain
    assert "Password reset" in html_doc
    assert "Reset password</a>" in html_doc


def test_render_payment_received_bodies():
    plain, html_doc = render_payment_received_bodies(
        PaymentReceivedEmailData(
            doc_number="1042",
            amount=468800,
            currency="NGN",
            client_name="Acme Ltd",
            dashboard_url="https://gentletap.co/dashboard/invoices/123",
        )
    )
    assert "Payment received" in plain
    assert "₦468,800.00" in plain
    assert "Acme Ltd paid invoice #1042" in plain
    assert "View in GentleTap</a>" in html_doc
    assert "Synced from QuickBooks" in html_doc

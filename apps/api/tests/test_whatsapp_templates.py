from datetime import UTC, datetime

from gentletap.integrations.twilio import templates as wa_templates
from gentletap.intelligence.schemas import ClientProfile, InvoiceContext, ReminderContext, Tone


def _ctx(*, step: int = 1, days_overdue: int = 5) -> ReminderContext:
    return ReminderContext(
        client_id="c1",
        client_name="Sarah Chen",
        client_email="sarah@example.com",
        client_phone="+15551234567",
        user_plan="pro_plus",
        sender_name="Acme Design Co",
        profile=ClientProfile(),
        invoice=InvoiceContext(
            invoice_id="inv1",
            doc_number="1042",
            amount=4200,
            balance=4200,
            days_overdue=days_overdue,
            due_date=datetime.now(UTC),
            sequence_step=step,
            approved=True,
        ),
    )


def test_select_template_key_escalates_with_step():
    assert wa_templates.select_template_key(0, Tone.WARM) == "gentle"
    assert wa_templates.select_template_key(2, Tone.FRIENDLY) == "follow_up"
    assert wa_templates.select_template_key(4, Tone.FRIENDLY) == "final"
    assert wa_templates.select_template_key(1, Tone.URGENT) == "final"


def test_build_variables_and_preview():
    variables = wa_templates.build_variables(_ctx(), sender_name="Acme Design Co")
    assert variables["1"] == "Sarah Chen"
    assert variables["3"] == "1042"
    assert variables["4"] == "$4,200.00"
    assert "5 days overdue" in variables["5"]

    preview = wa_templates.render_preview("gentle", variables)
    assert "Sarah Chen" in preview
    assert "1042" in preview
    assert "$4,200.00" in preview
    assert "{{" not in preview


def test_meta_template_copy_has_five_placeholders():
    for key, copy in wa_templates.META_TEMPLATE_COPY.items():
        assert copy.count("{{") == 5, key

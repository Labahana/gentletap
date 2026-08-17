"""Static fallback reminder templates per tone (Jinja2-style placeholders)."""

from __future__ import annotations

from typing import Any, Dict

# Placeholders: {{ client_first_name }}, {{ invoice_number }}, {{ amount }},
# {{ currency }}, {{ due_date }}, {{ days_overdue }}, {{ payment_link }}, {{ owner_name }}

STATIC_BODIES: Dict[str, str] = {
    "warm": (
        "Hi {{ client_first_name }},\n\n"
        "Hope you're doing well! Just a gentle note that invoice #{{ invoice_number }} "
        "for {{ amount }} {{ currency }} was due on {{ due_date }}. "
        "If you've already taken care of it, thank you so much. "
        "Otherwise you can pay here: {{ payment_link }}\n\n"
        "Warmly,\n{{ owner_name }}"
    ),
    "friendly": (
        "Hi {{ client_first_name }},\n\n"
        "Friendly reminder that invoice #{{ invoice_number }} for {{ amount }} {{ currency }} "
        "is {{ days_overdue }} days past due (due {{ due_date }}). "
        "Happy to help if anything needs clarifying — otherwise please pay via {{ payment_link }}.\n\n"
        "Thanks,\n{{ owner_name }}"
    ),
    "professional": (
        "Hi {{ client_first_name }},\n\n"
        "I'm following up on invoice #{{ invoice_number }} for {{ amount }} {{ currency }}, "
        "due {{ due_date }} and now {{ days_overdue }} days past due. "
        "Please arrange payment at {{ payment_link }} or reply with an expected payment date.\n\n"
        "Best regards,\n{{ owner_name }}"
    ),
    "firm": (
        "Hi {{ client_first_name }},\n\n"
        "Invoice #{{ invoice_number }} for {{ amount }} {{ currency }} remains unpaid "
        "({{ days_overdue }} days past the {{ due_date }} due date). "
        "Please complete payment at {{ payment_link }} this week so we can close this out. "
        "I'll follow up if I don't hear back.\n\n"
        "Regards,\n{{ owner_name }}"
    ),
    "urgent": (
        "Hi {{ client_first_name }},\n\n"
        "I need a quick update on invoice #{{ invoice_number }} for {{ amount }} {{ currency }}, "
        "now {{ days_overdue }} days past due. Please reply with an ETA or pay at {{ payment_link }}. "
        "I'll follow up personally if I don't hear from you soon.\n\n"
        "Thank you,\n{{ owner_name }}"
    ),
}

STATIC_SUBJECTS: Dict[str, str] = {
    "warm": "Quick check-in on invoice #{{ invoice_number }}",
    "friendly": "Reminder: invoice #{{ invoice_number }}",
    "professional": "Payment reminder — invoice #{{ invoice_number }}",
    "firm": "Follow-up needed: invoice #{{ invoice_number }}",
    "urgent": "Please reply: invoice #{{ invoice_number }}",
}

# Legacy Phase 1 format used by templates UI generate endpoint
STATIC_TEMPLATES: Dict[str, Dict[str, str]] = {
    tone: {
        "subject": STATIC_SUBJECTS[tone]
        .replace("{{ invoice_number }}", "{invoice_number}")
        .replace("{{ client_first_name }}", "{client_name}"),
        "body": STATIC_BODIES[tone]
        .replace("{{ client_first_name }}", "{client_name}")
        .replace("{{ invoice_number }}", "{invoice_number}")
        .replace("{{ amount }}", "{amount}")
        .replace("{{ currency }}", "")
        .replace("{{ due_date }}", "{due_date}")
        .replace("{{ days_overdue }}", "{days_overdue}")
        .replace("{{ payment_link }}", "your payment link")
        .replace("{{ owner_name }}", "Your Team"),
    }
    for tone in STATIC_BODIES
}


def get_static_template(tone: str) -> Dict[str, str]:
    normalized = (tone or "friendly").lower()
    return STATIC_TEMPLATES.get(normalized, STATIC_TEMPLATES["friendly"])


def render_static_body(tone: str, context: Dict[str, Any]) -> str:
    template = STATIC_BODIES.get((tone or "friendly").lower(), STATIC_BODIES["friendly"])
    return _render(template, context)


def render_static_subject(tone: str, context: Dict[str, Any]) -> str:
    template = STATIC_SUBJECTS.get((tone or "friendly").lower(), STATIC_SUBJECTS["friendly"])
    return _render(template, context)


def _render(template: str, context: Dict[str, Any]) -> str:
    result = template
    for key, value in context.items():
        result = result.replace("{{ " + key + " }}", str(value if value is not None else ""))
        result = result.replace("{{" + key + "}}", str(value if value is not None else ""))
    return result

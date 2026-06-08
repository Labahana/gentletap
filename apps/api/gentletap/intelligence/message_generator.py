from gentletap.intelligence.schemas import GeneratedMessage, ReminderContext, Tone


def _tone_instruction(tone: Tone) -> str:
    mapping = {
        Tone.WARM: "warm and light — like a friendly heads-up",
        Tone.FRIENDLY: "friendly and helpful — assume they forgot",
        Tone.PROFESSIONAL: "professional and direct — clear about the overdue status",
        Tone.FIRM: "firm but respectful — include a clear deadline",
        Tone.URGENT: "urgent and human — suggest personal follow-up may be needed soon",
    }
    return mapping[tone]


def generate_message(ctx: ReminderContext, tone: Tone) -> GeneratedMessage:
    """
    MVP: template-based generation. Week 5 replaces with OpenAI.
    """
    inv = ctx.invoice
    tone_line = _tone_instruction(tone)
    subject = f"Quick note on invoice #{inv.doc_number}"
    body = f"""Hi {ctx.client_name},

Hope you're having a good week. Just a gentle check-in that invoice #{inv.doc_number} for ${inv.balance:,.2f} was due on {inv.due_date.strftime('%B %d, %Y')} ({inv.days_overdue} days ago).

I'm sure it just slipped through — wanted to make sure it's on your radar. Happy to answer any questions.

Best regards

---
(Tone: {tone_line})"""
    return GeneratedMessage(subject=subject, body=body)

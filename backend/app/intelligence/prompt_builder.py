"""Psychology-aware prompt construction for reminder email generation."""

from app.intelligence.schemas import ReminderContext, RiskLevel, Tone

_STEP_INTENT: dict[int, tuple[str, str]] = {
    0: (
        "First gentle touch",
        "Assume they overlooked it or AP is backlogged. Lead with warmth, not urgency. "
        "Make replying easy — ask them to confirm payment is scheduled or flag any blocker.",
    ),
    1: (
        "Friendly follow-up",
        "They may have seen the first note. Stay polite; add light specificity (invoice #, amount, due date). "
        "Acknowledge they're busy — one sentence max — then restate the single ask.",
    ),
    2: (
        "Clear professional nudge",
        "Be direct about what's outstanding without sounding punitive. "
        "Reference that this is a follow-up (not the first time) only if prior reminders were sent.",
    ),
    3: (
        "Firm but respectful",
        "Signal that timely payment matters to your cash flow, still person-to-person. "
        "Offer a concrete next step (pay link, reply with ETA, or raise an issue).",
    ),
    4: (
        "Final automated touch before human handoff",
        "Last respectful automated note. Clear, calm urgency — suggest you'll reach out personally "
        "if you don't hear back. Never threaten legal action or collections language.",
    ),
}

_TONE_PSYCHOLOGY: dict[Tone, str] = {
    Tone.WARM: (
        "Tone: warm and light.\n"
        "Psychology: positive intent, minimal pressure. A trusted long-term client deserves "
        "a soft heads-up — gratitude for the relationship, then the facts."
    ),
    Tone.FRIENDLY: (
        "Tone: friendly and helpful.\n"
        "Psychology: assume they forgot, not that they're avoiding you. "
        "Face-saving language ('when you get a chance', 'just checking in') lowers defensiveness."
    ),
    Tone.PROFESSIONAL: (
        "Tone: professional and clear.\n"
        "Psychology: specificity builds trust — exact invoice #, amount, due date. "
        "One clear call-to-action. No guilt, no fluff."
    ),
    Tone.FIRM: (
        "Tone: firm but respectful.\n"
        "Psychology: consistency principle — you've followed up before; state what's needed and by when. "
        "Stay human; invite them to reply if something is wrong."
    ),
    Tone.URGENT: (
        "Tone: urgent and human.\n"
        "Psychology: scarcity of time, not threats. Signal you'll follow up personally soon. "
        "Keep it short; make the next step unmistakable."
    ),
}


def _relationship_read(ctx: ReminderContext) -> str:
    profile = ctx.profile
    parts: list[str] = []

    if profile.tenure_months >= 12 and profile.late_payment_rate < 0.2:
        parts.append(
            f"Long-standing client ({profile.tenure_months} months) with a strong payment track record — "
            "lean on rapport; this is likely an oversight."
        )
    elif profile.tenure_months >= 6:
        parts.append(f"Established relationship ({profile.tenure_months} months).")
    else:
        parts.append("Newer client — be welcoming, not presumptuous about history.")

    if profile.late_payment_rate > 0.5:
        parts.append(
            f"Often pays late ({profile.late_payment_rate:.0%} of invoices) — be clear and specific; "
            "still avoid shame or threats."
        )
    elif profile.late_payment_rate > 0:
        parts.append(f"Occasionally pays late ({profile.late_payment_rate:.0%}).")

    if profile.invoices_paid_on_time > 0 or profile.invoices_paid_late > 0:
        parts.append(
            f"History: {profile.invoices_paid_on_time} on-time, {profile.invoices_paid_late} late."
        )

    if profile.avg_days_to_pay is not None:
        parts.append(f"Typical pay cycle: ~{profile.avg_days_to_pay:.0f} days after due date.")

    if profile.risk_level == RiskLevel.HIGH:
        parts.append("Higher payment risk — clarity and a concrete deadline help.")
    elif profile.risk_level == RiskLevel.LOW:
        parts.append("Low payment risk — prioritize relationship over pressure.")

    return " ".join(parts)


def _step_section(ctx: ReminderContext) -> str:
    step = min(ctx.invoice.sequence_step, 4)
    label, intent = _STEP_INTENT[step]
    lines = [
        f"Sequence step: {step} of 4 — {label}",
        f"Intent: {intent}",
    ]
    if ctx.prior_messages_count > 0:
        lines.append(
            f"Prior reminders already sent on this invoice: {ctx.prior_messages_count}. "
            "Do not write as if this is the first contact unless step is 0."
        )
    elif step > 0:
        lines.append(
            "No prior sent messages recorded yet, but step > 0 — write as a follow-up in the sequence."
        )
    return "\n".join(lines)


def build_reminder_prompts(ctx: ReminderContext, tone: Tone) -> tuple[str, str]:
    """Return (system_prompt, user_prompt) for AI reminder generation."""
    inv = ctx.invoice
    profile = ctx.profile
    due_str = inv.due_date.strftime("%B %d, %Y")

    system = """You write payment reminder emails for freelancers and small businesses.

GOAL
Get the invoice paid while preserving the client relationship. Sound like a real person —
the named sender — not a collections bot or mass-mail system.

PSYCHOLOGY (apply subtly; never explain these principles in the email)
- Assume positive intent early; busy people forget — shame makes them avoid replying.
- Face-saving: make it easy to respond ("let me know if something's blocking this").
- Specificity builds trust: exact invoice number, amount, and due date — vague emails feel like spam.
- One clear ask per email: confirm payment, share an ETA, or flag a problem.
- Reciprocity: acknowledge good history when tenure is long or payment record is strong.
- Escalate through clarity and consistency, never threats or guilt trips.

VOICE & FORMAT
- First person as the sender ("I", "my invoice"). 80–140 words. Short paragraphs.
- Subject: specific, calm, 6–10 words. No ALL CAPS, no "URGENT!!!", no spammy punctuation.
- Sign off with the sender's exact name on its own line after a blank line.

FORBIDDEN WORDS & PHRASES
collections, debt collector, demand notice, overdue notice, legal action, final notice,
pay immediately or else, lawsuit, collections agency.

FORBIDDEN PLACEHOLDERS
Never use [Your Name], [Name], {name}, {{sender_name}}, or similar — use the real sender name.

OUTPUT
Respond with JSON only: {"subject": "...", "body": "..."}"""

    user_lines = [
        "## Sender",
        f"Name: {ctx.sender_name}",
        "Sign the email with this exact name.",
        "",
        "## Client relationship",
        f"Client: {ctx.client_name}",
        f"Tenure: {profile.tenure_months} months",
        f"Late payment rate: {profile.late_payment_rate:.0%}",
        f"Risk level: {profile.risk_level.value}",
        f"On-time / late invoices: {profile.invoices_paid_on_time} / {profile.invoices_paid_late}",
    ]
    if profile.avg_days_to_pay is not None:
        user_lines.append(f"Average days to pay after due: {profile.avg_days_to_pay:.0f}")
    if profile.communication_style and profile.communication_style != "unknown":
        user_lines.append(f"Communication style: {profile.communication_style}")
    user_lines.extend(
        [
            f"Relationship read: {_relationship_read(ctx)}",
            "",
            "## Invoice",
            f"Number: #{inv.doc_number}",
            f"Amount outstanding: ${inv.balance:,.2f} {inv.currency}",
            f"Original amount: ${inv.amount:,.2f}",
            f"Due date: {due_str}",
            f"Days overdue: {inv.days_overdue}",
            "",
            "## Sequence context",
            _step_section(ctx),
            "",
            "## Tone & psychology",
            _TONE_PSYCHOLOGY[tone],
            "",
        ]
    )

    if inv.payment_link:
        user_lines.extend(
            [
                "## Payment",
                f"Include this payment link naturally as the easiest way to pay: {inv.payment_link}",
                "",
            ]
        )

    user_lines.append(
        "Write the reminder email now. Personalize for this client and step — "
        "avoid generic template phrasing like 'This is a reminder that'."
    )

    return system, "\n".join(user_lines)

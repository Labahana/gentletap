from gentletap.intelligence.schemas import ReminderContext


def escalation_recommendation(ctx: ReminderContext) -> str:
    inv = ctx.invoice
    name = ctx.client_name
    if inv.days_overdue >= 45:
        return (
            f"{name} is {inv.days_overdue} days late with no payment — "
            "consider a formal demand letter or pausing future work."
        )
    if inv.balance > 10_000 and inv.days_overdue >= 14:
        return (
            f"{name} owes ${inv.balance:,.2f} and hasn't paid in {inv.days_overdue} days — "
            "a personal phone call would be most effective now."
        )
    if inv.sequence_step >= 4:
        return (
            f"{name} hasn't responded after multiple reminders — "
            "suggest offering a payment plan or scheduling a direct conversation."
        )
    return (
        f"{name} is {inv.days_overdue} days overdue on invoice #{inv.doc_number} — "
        "review the thread and decide whether to call directly."
    )


def needs_human(ctx: ReminderContext) -> bool:
    inv = ctx.invoice
    return (
        inv.days_overdue >= 21
        or (float(inv.balance) > 10_000 and inv.days_overdue >= 14)
        or inv.sequence_step >= 4
    )

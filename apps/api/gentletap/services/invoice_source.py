"""Classify invoice origin (QuickBooks sync vs spreadsheet upload)."""

from gentletap.database import Invoice


def invoice_source(inv: Invoice) -> str:
    if inv.source in ("upload", "quickbooks"):
        return inv.source
    if (inv.qb_invoice_id or "").startswith("csv:"):
        return "upload"
    return "quickbooks"


def invoice_source_label(source: str) -> str:
    return "Uploaded" if source == "upload" else "QuickBooks"


def invoice_needs_attention(inv: Invoice) -> tuple[bool, str | None]:
    if invoice_source(inv) != "upload" or float(inv.balance) <= 0:
        return False, None
    if inv.client_claimed_paid_at:
        return True, "client_claimed_paid"
    if inv.dispute_flag or inv.sequence_paused:
        return False, None
    if inv.days_overdue > 0 and not inv.sequence_active:
        return True, "not_on_autopilot"
    return False, None


def attention_reason_label(reason: str | None) -> str | None:
    if reason == "client_claimed_paid":
        return "Client says paid — confirm manually"
    if reason == "not_on_autopilot":
        return "Not on autopilot yet"
    return None


def source_counts_for_user(db, user_id) -> dict:
    from gentletap.database import Invoice

    rows = (
        db.query(Invoice)
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .all()
    )
    quickbooks_count = 0
    upload_count = 0
    upload_needs_attention = 0
    for inv in rows:
        if invoice_source(inv) == "upload":
            upload_count += 1
            if invoice_needs_attention(inv)[0]:
                upload_needs_attention += 1
        else:
            quickbooks_count += 1
    return {
        "quickbooks_count": quickbooks_count,
        "upload_count": upload_count,
        "upload_needs_attention": upload_needs_attention,
    }

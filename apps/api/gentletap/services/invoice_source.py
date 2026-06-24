"""Classify invoice origin (QuickBooks sync vs spreadsheet upload)."""

from sqlalchemy import case, func, or_

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
        return "Reminders not started — go live or re-upload"
    return None


def _is_upload_expr():
    return or_(
        Invoice.source == "upload",
        Invoice.qb_invoice_id.like("csv:%"),
    )


def source_counts_for_user(db, user_id) -> dict:
    from gentletap.database import Invoice

    upload_expr = _is_upload_expr()
    attention_expr = upload_expr & (
        Invoice.client_claimed_paid_at.isnot(None)
        | (
            Invoice.dispute_flag.is_(False)
            & Invoice.sequence_paused.is_(False)
            & (Invoice.days_overdue > 0)
            & Invoice.sequence_active.is_(False)
        )
    )

    row = (
        db.query(
            func.sum(case((upload_expr, 1), else_=0)).label("upload_count"),
            func.sum(case((~upload_expr, 1), else_=0)).label("quickbooks_count"),
            func.sum(case((attention_expr, 1), else_=0)).label("upload_needs_attention"),
        )
        .filter(Invoice.user_id == user_id, Invoice.balance > 0)
        .one()
    )
    return {
        "quickbooks_count": int(row.quickbooks_count or 0),
        "upload_count": int(row.upload_count or 0),
        "upload_needs_attention": int(row.upload_needs_attention or 0),
    }

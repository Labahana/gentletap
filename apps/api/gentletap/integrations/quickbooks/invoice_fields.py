"""Map QuickBooks Invoice API fields into GentleTap models."""

_MAX_LINK_LEN = 2048


def payment_link_from_qb(qb_invoice: dict) -> str | None:
    """Extract Intuit hosted invoice / pay-online URL when present."""
    raw = qb_invoice.get("InvoiceLink")
    if not raw or not isinstance(raw, str):
        return None
    link = raw.strip()
    if not link.lower().startswith(("http://", "https://")):
        return None
    return link[:_MAX_LINK_LEN]

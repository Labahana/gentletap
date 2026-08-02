"""External ID helpers — FreshBooks rows reuse qb_* columns with an fb: prefix (same pattern as csv:)."""

FB_PREFIX = "fb:"


def to_external_client_id(freshbooks_client_id: int | str) -> str:
    return f"{FB_PREFIX}{freshbooks_client_id}"


def to_external_invoice_id(freshbooks_invoice_id: int | str) -> str:
    return f"{FB_PREFIX}{freshbooks_invoice_id}"


def from_external_id(external_id: str | None) -> str | None:
    if not external_id or not external_id.startswith(FB_PREFIX):
        return None
    return external_id[len(FB_PREFIX) :]


def is_freshbooks_external_id(external_id: str | None) -> bool:
    return bool(external_id and external_id.startswith(FB_PREFIX))

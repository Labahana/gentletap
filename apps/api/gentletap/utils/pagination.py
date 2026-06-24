"""Keyset (cursor) pagination helpers for invoice lists."""

import base64
import json
from decimal import Decimal
from uuid import UUID

from gentletap.database import Invoice


def encode_invoice_cursor(invoice: Invoice) -> str:
    payload = {
        "d": invoice.days_overdue,
        "b": str(invoice.balance),
        "id": str(invoice.id),
    }
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def decode_invoice_cursor(cursor: str) -> tuple[int, Decimal, UUID]:
    data = json.loads(base64.urlsafe_b64decode(cursor.encode()).decode())
    return int(data["d"]), Decimal(data["b"]), UUID(data["id"])

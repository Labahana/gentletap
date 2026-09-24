"""Autonomy levels: decide whether a reminder needs human approval before sending.

approval_mode on OrgSettings:
- off: everything sends automatically (default).
- first_batch: the first reminder ever sent for an invoice needs approval;
  once one has gone out, the rest of the sequence runs unsupervised.
- amount_threshold: any reminder for an invoice at or above the configured
  threshold needs approval, every step.
"""

from __future__ import annotations

from typing import Optional, Tuple

from sqlalchemy.orm import Session

from app.models.invoice import Invoice
from app.models.message import Message
from app.models.org_settings import OrgSettings


def requires_approval(
    db: Session, org_settings: OrgSettings, invoice: Invoice
) -> Tuple[bool, Optional[str]]:
    """Return (needs_approval, reason). Reason is a stable machine-readable tag."""
    mode = org_settings.approval_mode or "off"
    if mode == "off":
        return False, None

    if mode == "amount_threshold":
        threshold = org_settings.approval_threshold_amount
        if threshold is not None and float(invoice.amount or 0) >= float(threshold):
            return True, "amount_threshold"
        return False, None

    if mode == "first_batch":
        sent = (
            db.query(Message.id)
            .filter(Message.invoice_id == invoice.id, Message.status == "sent")
            .first()
        )
        if sent is None:
            return True, "first_batch"
        return False, None

    return False, None

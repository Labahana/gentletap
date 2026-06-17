"""Free-plan monthly collection limits."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import Invoice, Profile
from gentletap.plans import has_unlimited_sequences


def month_start() -> datetime:
    now = datetime.now(UTC)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def count_monthly_collections(db: Session, user_id: UUID) -> int:
    """Invoices that started collection this calendar month."""
    start = month_start()
    return (
        db.query(Invoice)
        .filter(
            Invoice.user_id == user_id,
            Invoice.sequence_started_at.isnot(None),
            Invoice.sequence_started_at >= start,
        )
        .count()
    )


def uses_new_monthly_slot(invoice: Invoice) -> bool:
    """Whether activating this invoice consumes a monthly collection slot."""
    if invoice.sequence_started_at is None:
        return True
    return invoice.sequence_started_at < month_start()


def mark_collection_started(invoice: Invoice) -> None:
    if uses_new_monthly_slot(invoice):
        invoice.sequence_started_at = datetime.now(UTC)


def ensure_can_activate(db: Session, user: Profile, invoices: list[Invoice]) -> None:
    if has_unlimited_sequences(user.plan) or not invoices:
        return

    limit = get_settings().free_plan_monthly_collection_limit
    used = count_monthly_collections(db, user.id)
    new_slots = sum(1 for inv in invoices if uses_new_monthly_slot(inv))
    if used + new_slots > limit:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=(
                f"Starter plan allows {limit} invoice collections per month "
                f"({used} used). Upgrade to Pro for unlimited."
            ),
        )


def free_plan_collection_usage(db: Session, user: Profile) -> dict | None:
    if has_unlimited_sequences(user.plan):
        return None
    limit = get_settings().free_plan_monthly_collection_limit
    used = count_monthly_collections(db, user.id)
    return {
        "monthly_limit": limit,
        "monthly_used": used,
        "monthly_remaining": max(0, limit - used),
        "cap_reached": used >= limit,
    }

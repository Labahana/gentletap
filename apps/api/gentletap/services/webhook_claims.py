"""Race-safe webhook event claiming for idempotent delivery.

Two deliveries of the same provider event can arrive concurrently (at-least-once
delivery + retries). A read-then-insert claim races: both pass the existence check
and both insert, so the loser raises IntegrityError on the PK. These helpers use
INSERT ... ON CONFLICT DO NOTHING so exactly one caller wins and the loser gets a
clean "already processed" signal instead of an exception.
"""

from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session

from gentletap.database import BillingWebhookEvent, IntegrationWebhookEvent


def claim_integration_event(db: Session, event_key: str) -> bool:
    """True if this integration event should be processed (first claimant wins)."""
    if not event_key:
        return True
    stmt = (
        pg_insert(IntegrationWebhookEvent)
        .values(event_key=event_key)
        .on_conflict_do_nothing(index_elements=["event_key"])
    )
    result = db.execute(stmt)
    db.flush()
    return (result.rowcount or 0) == 1


def claim_billing_event(db: Session, event_id: str) -> bool:
    """True if this billing event should be processed (first claimant wins)."""
    if not event_id:
        return True
    stmt = (
        pg_insert(BillingWebhookEvent)
        .values(event_id=event_id)
        .on_conflict_do_nothing(index_elements=["event_id"])
    )
    result = db.execute(stmt)
    db.flush()
    return (result.rowcount or 0) == 1

"""Account-level audit log for team/self-serve changes."""

from uuid import UUID

from sqlalchemy.orm import Session

from gentletap.database import AccountAuditEvent


def record_event(
    db: Session,
    *,
    account_id: UUID,
    actor_user_id: UUID | None,
    action: str,
    metadata: dict | None = None,
) -> AccountAuditEvent:
    event = AccountAuditEvent(
        account_id=account_id,
        actor_user_id=actor_user_id,
        action=action[:80],
        metadata_json=metadata,
    )
    db.add(event)
    return event

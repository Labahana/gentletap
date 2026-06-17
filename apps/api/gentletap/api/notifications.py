from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from gentletap.database import UserNotification, get_db
from gentletap.dependencies import CurrentUser

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    rows = (
        db.query(UserNotification)
        .filter(UserNotification.user_id == user.id)
        .order_by(UserNotification.created_at.desc())
        .limit(30)
        .all()
    )
    return {
        "items": [
            {
                "id": str(n.id),
                "kind": n.kind,
                "title": n.title,
                "body": n.body,
                "invoice_id": str(n.invoice_id) if n.invoice_id else None,
                "read": n.read_at is not None,
                "created_at": n.created_at.isoformat(),
            }
            for n in rows
        ]
    }


@router.post("/{notification_id}/read")
def mark_notification_read(
    notification_id: UUID,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> dict:
    row = (
        db.query(UserNotification)
        .filter(UserNotification.id == notification_id, UserNotification.user_id == user.id)
        .one_or_none()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    if row.read_at is None:
        row.read_at = datetime.now(UTC)
        db.commit()
    return {"read": True}
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.notification import NotificationPreference, UserNotification

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationPreferenceIn(BaseModel):
    email_on_payment: Optional[bool] = None
    email_on_escalation: Optional[bool] = None
    email_on_sync_error: Optional[bool] = None
    daily_digest: Optional[bool] = None


def get_or_create_prefs(db: Session, user_id: str) -> NotificationPreference:
    prefs = db.query(NotificationPreference).filter(NotificationPreference.user_id == user_id).first()
    if not prefs:
        prefs = NotificationPreference(user_id=user_id)
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    return prefs


@router.get("")
def list_notifications(
    limit: int = 50,
    unread_only: bool = False,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    q = db.query(UserNotification).filter(
        UserNotification.user_id == user.id, UserNotification.org_id == org.id
    )
    if unread_only:
        q = q.filter(UserNotification.read_at.is_(None))
    items = q.order_by(UserNotification.created_at.desc()).limit(min(limit, 200)).all()
    unread = (
        db.query(UserNotification)
        .filter(
            UserNotification.user_id == user.id,
            UserNotification.org_id == org.id,
            UserNotification.read_at.is_(None),
        )
        .count()
    )
    return {
        "items": [
            {
                "id": n.id,
                "type": n.type,
                "title": n.title,
                "body": n.body,
                "link": n.link,
                "read": n.read_at is not None,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
        "unread": unread,
    }


@router.post("/{notification_id}/read")
def mark_read(
    notification_id: str,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    n = (
        db.query(UserNotification)
        .filter(
            UserNotification.id == notification_id,
            UserNotification.user_id == user.id,
        )
        .first()
    )
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    if n.read_at is None:
        n.read_at = datetime.utcnow()
        db.commit()
    return {"ok": True}


@router.post("/read-all")
def mark_all_read(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    user, org = user_and_org
    db.query(UserNotification).filter(
        UserNotification.user_id == user.id,
        UserNotification.org_id == org.id,
        UserNotification.read_at.is_(None),
    ).update({"read_at": datetime.utcnow()}, synchronize_session=False)
    db.commit()
    return {"ok": True}


@router.get("/preferences")
def get_preferences(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, user = user_and_org
    prefs = get_or_create_prefs(db, user.id)
    return {
        "email_on_payment": prefs.email_on_payment,
        "email_on_escalation": prefs.email_on_escalation,
        "email_on_sync_error": prefs.email_on_sync_error,
        "daily_digest": prefs.daily_digest,
    }


@router.put("/preferences")
def update_preferences(
    body: NotificationPreferenceIn,
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
):
    _, user = user_and_org
    prefs = get_or_create_prefs(db, user.id)
    for field, value in body.dict(exclude_none=True).items():
        setattr(prefs, field, value)
    db.commit()
    return {"ok": True}

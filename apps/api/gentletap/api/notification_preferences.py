"""Notification preferences (event × channel matrix) API."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from gentletap.database import NotificationPreference, get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.notification_prefs import (
    CHANNELS,
    EVENTS,
    defaults,
    merge_prefs,
)

router = APIRouter(prefix="/notification-preferences", tags=["notifications"])


class PrefsBody(BaseModel):
    prefs: dict


@router.get("")
def read_preferences(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    row = db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).one_or_none()
    return {"events": EVENTS, "channels": CHANNELS, "prefs": merge_prefs(row.prefs if row else None)}


@router.put("")
def update_preferences(body: PrefsBody, user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    row = db.query(NotificationPreference).filter(NotificationPreference.user_id == user.id).one_or_none()
    if row is None:
        row = NotificationPreference(user_id=user.id, prefs=defaults())
        db.add(row)
    row.prefs = merge_prefs(body.prefs)
    db.commit()
    return {"prefs": row.prefs}

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gentletap.database import get_db
from gentletap.dependencies import CurrentUser
from gentletap.services.analytics_data import build_analytics

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("")
def get_analytics(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    return build_analytics(db, user.id)

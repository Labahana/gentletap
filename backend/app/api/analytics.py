from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.services.analytics_data import build_analytics

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("")
def get_analytics(user_and_org=Depends(get_current_user_and_org), db: Session = Depends(get_db)) -> dict:
    _, org = user_and_org
    return build_analytics(db, org.id)

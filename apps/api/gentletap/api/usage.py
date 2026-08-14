"""Usage meters for the current account (collections + WhatsApp)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import get_db
from gentletap.dependencies import CurrentUser
from gentletap.plans import (
    has_unlimited_sequences,
    has_whatsapp,
    plan_display_name,
    whatsapp_monthly_limit,
)
from gentletap.services.plan_limits import count_monthly_collections
from gentletap.services.whatsapp_usage import whatsapp_usage_summary

router = APIRouter(prefix="/usage", tags=["usage"])


@router.get("")
def usage_summary(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    settings = get_settings()
    collections_used = count_monthly_collections(db, user.id)
    unlimited = has_unlimited_sequences(user.plan)
    wa = whatsapp_usage_summary(db, user) if has_whatsapp(user.plan) else None
    return {
        "plan": user.plan,
        "plan_display_name": plan_display_name(user.plan),
        "collections": {
            "used": collections_used,
            "limit": None if unlimited else settings.free_plan_monthly_collection_limit,
            "unlimited": unlimited,
        },
        "whatsapp": wa,
    }

"""Usage metering endpoint: current period quotas vs consumption."""

from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.api.deps import get_current_user_and_org
from app.models.message import Message
from app.models.organization import Organization
from app.services.plan_gating import available_whatsapp_credits, normalize_plan

router = APIRouter(prefix="/usage", tags=["Usage"])


def _month_start() -> datetime:
    now = datetime.now(timezone.utc)
    return now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


@router.get("")
def get_usage(
    user_and_org=Depends(get_current_user_and_org),
    db: Session = Depends(get_db),
) -> dict:
    _, org = user_and_org
    start = _month_start()

    emails_sent = (
        db.query(func.count(Message.id))
        .filter(
            Message.org_id == org.id,
            Message.channel == "email",
            Message.created_at >= start,
            Message.status != "failed",
        )
        .scalar()
        or 0
    )

    whatsapp_sent = (
        db.query(func.count(Message.id))
        .filter(
            Message.org_id == org.id,
            Message.channel == "whatsapp",
            Message.created_at >= start,
            Message.status != "failed",
        )
        .scalar()
        or 0
    )

    plan = normalize_plan(org.plan)
    collections_used = org.collections_used_this_period or 0
    collections_quota = org.collections_quota or 5
    whatsapp_quota = org.whatsapp_quota or 0

    return {
        "plan": plan,
        "period_start": start.isoformat(),
        "collections": {
            "used": collections_used,
            "quota": collections_quota,
            "unlimited": collections_quota >= 999999,
        },
        "emails_sent": emails_sent,
        "whatsapp": {
            "sent": whatsapp_sent,
            "quota": whatsapp_quota,
            "credit_packs_remaining": available_whatsapp_credits(db, org.id),
        },
        "team_members": db.query(func.count(Organization.id)).filter(Organization.id == org.id).scalar() or 1,
    }

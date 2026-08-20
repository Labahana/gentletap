"""Internal admin endpoints — protected by admin_api_key header."""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db, engine
from app.api.deps import create_access_token
from app.models.organization import Organization
from app.models.user import User
from app.models.message import Message
from app.models.connection import Connection
from app.models.subscription import Subscription
from app.models.audit_log import AuditLog
from app.services.plan_gating import PLAN_PRICES, normalize_plan

router = APIRouter(prefix="/admin", tags=["Admin"])
settings = get_settings()


def require_admin(x_admin_api_key: str = Header(None, alias="X-Admin-Api-Key")):
    if not x_admin_api_key or x_admin_api_key != settings.admin_api_key:
        raise HTTPException(status_code=401, detail="Invalid admin API key")
    return True


@router.get("/orgs")
def list_orgs(_: bool = Depends(require_admin), db: Session = Depends(get_db)):
    orgs = db.query(Organization).order_by(Organization.created_at.desc()).limit(200).all()
    return [
        {
            "id": o.id,
            "name": o.name,
            "plan": normalize_plan(o.plan),
            "collections_used": o.collections_used_this_period,
            "whatsapp_used": o.whatsapp_used_this_period,
            "created_at": o.created_at,
        }
        for o in orgs
    ]


@router.get("/orgs/{org_id}")
def org_detail(org_id: str, _: bool = Depends(require_admin), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    owner = db.query(User).filter(User.id == org.owner_user_id).first()
    connections = db.query(Connection).filter(Connection.org_id == org.id).all()
    return {
        "org": {
            "id": org.id,
            "name": org.name,
            "plan": normalize_plan(org.plan),
            "paddle_customer_id": org.paddle_customer_id,
        },
        "owner": {"id": owner.id, "email": owner.email} if owner else None,
        "connections": [{"id": c.id, "provider": c.provider, "status": c.status} for c in connections],
    }


@router.post("/orgs/{org_id}/impersonate")
def impersonate(org_id: str, _: bool = Depends(require_admin), db: Session = Depends(get_db)):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    owner = db.query(User).filter(User.id == org.owner_user_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    token = create_access_token(owner.id, org.id, owner.email)
    return {"access_token": token, "token_type": "bearer", "expires_in_minutes": 15}


@router.get("/stats")
def admin_stats(_: bool = Depends(require_admin), db: Session = Depends(get_db)):
    total_orgs = db.query(Organization).count()
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    messages_today = db.query(Message).filter(Message.created_at >= today_start).count()
    active_connections = db.query(Connection).filter(Connection.status == "active").count()

    mrr = 0.0
    for org in db.query(Organization).all():
        plan = normalize_plan(org.plan)
        if plan == "starter":
            continue
        prices = PLAN_PRICES[plan]
        mrr += prices["annual"] if org.billing_period == "annual" else prices["monthly"]

    return {
        "total_orgs": total_orgs,
        "mrr": mrr,
        "active_connections": active_connections,
        "messages_sent_today": messages_today,
    }


@router.get("/health")
def admin_health(_: bool = Depends(require_admin)):
    from app.api import health as health_mod

    return {
        "api": "ok",
        "db": health_mod.check_db(),
        "redis": health_mod.check_redis(),
        "celery": health_mod.check_celery(),
    }


@router.get("/users")
def list_users(
    limit: int = 100,
    offset: int = 0,
    _: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    users = db.query(User).order_by(User.created_at.desc()).offset(offset).limit(min(limit, 500)).all()
    total = db.query(User).count()
    return {
        "total": total,
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "created_at": u.created_at,
                "deleted_at": getattr(u, "deleted_at", None),
            }
            for u in users
        ],
    }


@router.get("/audit-log")
def audit_log(
    limit: int = 100,
    org_id: str = None,
    _: bool = Depends(require_admin),
    db: Session = Depends(get_db),
):
    q = db.query(AuditLog)
    if org_id:
        q = q.filter(AuditLog.org_id == org_id)
    items = q.order_by(AuditLog.created_at.desc()).limit(min(limit, 500)).all()
    return {
        "items": [
            {
                "id": a.id,
                "org_id": a.org_id,
                "actor_type": a.actor_type,
                "actor_id": a.actor_id,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "details": a.details,
                "created_at": a.created_at,
            }
            for a in items
        ]
    }

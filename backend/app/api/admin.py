"""Internal admin console endpoints.

Access model:
- Missing/invalid credentials  -> 401 (frontend redirects to login).
- Authenticated but not in ADMIN_EMAILS -> 404 (do not leak that the route exists).
Every mutating call — and sensitive reads (org/user detail, impersonate) — is
written to audit_logs with the caller's client IP. Rate limits: reads 60/min,
actions 20/min, per admin+route.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.deps import create_access_token, decode_token
from app.config import get_settings
from app.database import get_db
from app.models.audit_log import AuditLog
from app.models.connection import Connection
from app.models.invoice import Invoice
from app.models.message import Message
from app.models.organization import Organization
from app.models.org_settings import OrgSettings
from app.models.reminder_job import ReminderJob
from app.models.subscription import Subscription
from app.models.user import User
from app.services.plan_gating import PLAN_PRICES, apply_plan_quotas, normalize_plan
from app.services.rate_limit import client_ip, rate_limit
from app.services.redis_lock import get_redis
from app.services.reminder_engine import get_or_create_org_settings
from app.workers.celery_app import celery_app

router = APIRouter(prefix="/admin", tags=["Admin"])
settings = get_settings()

STUCK_MINUTES = 15
_READ_LIMIT = rate_limit("60/60")
_ACTION_LIMIT = rate_limit("20/60")

_admin_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)


def _admin_emails() -> set:
    return {e.strip().lower() for e in (settings.admin_emails or []) if e.strip()}


def require_admin_flexible(
    request: Request,
    x_admin_api_key: Optional[str] = Header(None, alias="X-Admin-Api-Key"),
    token: Optional[str] = Depends(_admin_oauth2),
    db: Session = Depends(get_db),
):
    """Admin gate accepting either the X-Admin-Api-Key header (server-side ops)
    or a valid access token belonging to an ADMIN_EMAILS member (dashboard UI).

    Returns {"mode", "email", "ip"}. 401 when unauthenticated, 404 when
    authenticated but not an admin (route non-disclosure)."""
    ip = client_ip(request)
    if settings.admin_api_key and x_admin_api_key == settings.admin_api_key:
        return {"mode": "api_key", "email": None, "ip": ip}
    if token:
        try:
            payload = decode_token(token)
        except HTTPException:
            raise HTTPException(
                status_code=401,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if payload and payload.get("type") == "access":
            email = (payload.get("email") or "").strip().lower()
            if email and email in _admin_emails():
                user = db.query(User).filter(User.id == payload.get("sub")).first()
                if user is not None and user.email.lower() == email:
                    return {"mode": "jwt", "email": email, "ip": ip}
            # Valid login, not an admin: pretend the endpoint doesn't exist.
            raise HTTPException(status_code=404, detail="Not Found")
    raise HTTPException(
        status_code=401,
        detail="Admin access required",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _audit(
    db: Session,
    admin: dict,
    action: str,
    entity_type: str,
    entity_id: Optional[str] = None,
    org_id: Optional[str] = None,
    details: Optional[dict] = None,
):
    db.add(
        AuditLog(
            org_id=org_id,
            actor_type="admin",
            actor_id=admin.get("email") or "api_key",
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            details=details,
            ip=admin.get("ip"),
        )
    )
    db.commit()


def _utc(dt: Optional[datetime]) -> Optional[datetime]:
    if dt is not None and dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _utc_naive(dt: Optional[datetime]) -> Optional[datetime]:
    """Column values come back naive-UTC on sqlite (CURRENT_TIMESTAMP) and
    aware-UTC on Postgres; normalize to naive UTC so date bucketing and
    datetime comparisons never drift with the server's local timezone."""
    if dt is None:
        return None
    if dt.tzinfo is not None:
        dt = dt.astimezone(timezone.utc).replace(tzinfo=None)
    return dt


def _org_base(db: Session, org_id: str) -> Organization:
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Org not found")
    return org


def _connection_dict(c: Connection, now: datetime) -> dict:
    expires = _utc(c.token_expires_at)
    return {
        "id": c.id,
        "provider": c.provider,
        "status": c.status,
        "account_id": c.account_id,
        "realm_id": c.realm_id,
        "last_sync_at": c.last_sync_at,
        "token_expires_at": c.token_expires_at,
        "token_expiring_soon": bool(expires and now < expires <= now + timedelta(days=7)),
        "token_expired": bool(expires and expires <= now),
    }


@router.get("/access-check", dependencies=[Depends(_READ_LIMIT)])
def admin_access_check(token: Optional[str] = Depends(_admin_oauth2)):
    """Non-throwing check used by the admin dashboard to gate the UI."""
    is_admin = False
    email = None
    if token:
        try:
            payload = decode_token(token)
        except HTTPException:
            payload = None
        if payload and payload.get("type") == "access":
            email = (payload.get("email") or "").strip().lower() or None
            is_admin = bool(email) and email in _admin_emails()
    return {"is_admin": is_admin, "email": email}


@router.get("/health", dependencies=[Depends(_READ_LIMIT)])
def admin_health(_: dict = Depends(require_admin_flexible)):
    from app.api import health as health_mod

    return {
        "api": "ok",
        "db": health_mod.check_db(),
        "redis": health_mod.check_redis(),
        "celery": health_mod.check_celery(),
    }


# ---------------------------------------------------------------------------
# Overview
# ---------------------------------------------------------------------------

class _MrrSub:
    __slots__ = ("plan", "org_id", "current_period_end")

    def __init__(self, plan, org_id, current_period_end):
        self.plan = plan
        self.org_id = org_id
        self.current_period_end = current_period_end


def _mrr(db: Session) -> float:
    """MRR from active, un-lapsed Subscriptions only (org.plan is mutable and
    can read "team" for accounts that never paid). Single batch query for the
    org billing periods to avoid N+1."""
    now = datetime.now(timezone.utc)
    subs = (
        db.query(Subscription.plan, Subscription.org_id, Subscription.current_period_end)
        .filter(Subscription.status == "active")
        .all()
    )
    billing = dict(
        db.query(Organization.id, Organization.billing_period)
        .filter(Organization.id.in_({s.org_id for s in subs}))
        .all()
    ) if subs else {}
    mrr = 0.0
    for s in subs:
        plan = normalize_plan(s.plan)
        if plan == "starter":
            continue
        period_end = _utc(s.current_period_end)
        if period_end and period_end < now:
            continue
        prices = PLAN_PRICES[plan]
        mrr += prices["annual"] if billing.get(s.org_id) == "annual" else prices["monthly"]
    return mrr


def _stuck_cutoff(now: datetime) -> datetime:
    return now - timedelta(minutes=STUCK_MINUTES)


@router.get("/stats", dependencies=[Depends(_READ_LIMIT)])
def admin_stats(_: dict = Depends(require_admin_flexible), db: Session = Depends(get_db)):
    now = datetime.now(timezone.utc)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    pending_sub_rows = (
        db.query(Subscription.plan, Subscription.org_id, Subscription.current_period_end)
        .filter(Subscription.status == "incomplete", Subscription.current_period_end.is_(None))
        .all()
    )
    collections_30d = (
        db.query(func.coalesce(func.sum(Invoice.balance), 0))
        .filter(Invoice.status == "paid", Invoice.paid_at >= today_start - timedelta(days=30))
        .scalar()
    )
    return {
        "total_orgs": db.query(Organization).count(),
        "total_users": db.query(User).count(),
        "mrr": _mrr(db),
        "active_connections": db.query(Connection).filter(Connection.status == "active").count(),
        "messages_sent_today": db.query(Message).filter(Message.created_at >= today_start).count(),
        "signups_7d": db.query(User).filter(User.created_at >= now - timedelta(days=7)).count(),
        "signups_30d": db.query(User).filter(User.created_at >= now - timedelta(days=30)).count(),
        "collections_recovered_30d": float(collections_30d or 0),
        "pending_jobs": db.query(ReminderJob).filter(ReminderJob.status == "pending").count(),
        "stuck_jobs": db.query(ReminderJob).filter(
            ReminderJob.status == "processing",
            ReminderJob.updated_at <= _stuck_cutoff(now),
        ).count(),
        "failed_jobs_24h": db.query(ReminderJob).filter(
            ReminderJob.status == "failed", ReminderJob.updated_at >= now - timedelta(hours=24)
        ).count(),
        "subscription_health": {
            "active": db.query(Subscription).filter(Subscription.status == "active").count(),
            "past_due": db.query(Subscription).filter(Subscription.status == "past_due").count(),
            "canceled": db.query(Subscription).filter(Subscription.status == "canceled").count(),
            "trialing": db.query(Subscription).filter(Subscription.status == "trialing").count(),
            "pending_setup": len(pending_sub_rows),
        },
    }


@router.get("/metrics/timeseries", dependencies=[Depends(_READ_LIMIT)])
def admin_timeseries(
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    days: int = Query(14, ge=1, le=90),
):
    """Daily signups and messages. Bucketed in Python so sqlite and Postgres
    agree (func.date() is not portable across both)."""
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    days_list = [(start + timedelta(days=i)).date().isoformat() for i in range(days)]
    signup_rows = db.query(User.created_at).filter(User.created_at >= start).all()
    message_rows = db.query(Message.created_at).filter(Message.created_at >= start).all()

    def _bucket(rows):
        counts = {d: 0 for d in days_list}
        for (created,) in rows:
            created = _utc_naive(created)
            if created is None:
                continue
            key = created.date().isoformat()
            if key in counts:
                counts[key] += 1
        return [counts[d] for d in days_list]

    return {"days": days_list, "signals": {
        "signups": _bucket(signup_rows),
        "messages": _bucket(message_rows),
    }}


@router.get("/deliverability", dependencies=[Depends(_READ_LIMIT)])
def admin_deliverability(
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    days: int = Query(30, ge=1, le=90),
):
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = (
        db.query(Message.channel, Message.status, func.count(Message.id))
        .filter(Message.created_at >= since)
        .group_by(Message.channel, Message.status)
        .all()
    )
    by_channel: dict = {}
    for channel, status, count in rows:
        c = by_channel.setdefault(channel, {
            "channel": channel, "total": 0, "sent": 0, "delivered": 0,
            "opened": 0, "clicked": 0, "failed": 0, "bounced": 0,
        })
        c["total"] += count
        if status in ("sent", "delivered", "opened", "clicked"):
            c["sent"] += count
        if status in ("delivered", "opened", "clicked"):
            c["delivered"] += count
        if status == "opened":
            c["opened"] += count
        if status == "clicked":
            c["clicked"] += count
        if status in ("failed", "bounced"):
            c["failed"] += count
        if status == "bounced":
            c["bounced"] += count
    for c in by_channel.values():
        total = c["total"] or 1
        c["delivery_rate"] = round(c["delivered"] * 100.0 / total, 1)
        c["failure_rate"] = round(c["failed"] * 100.0 / total, 1)
    return {"days": days, "channels": list(by_channel.values())}


# ---------------------------------------------------------------------------
# Organizations
# ---------------------------------------------------------------------------

@router.get("/orgs", dependencies=[Depends(_READ_LIMIT)])
def list_orgs(
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, max_length=120),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(Organization)
    if search:
        like = f"%{search.strip()}%"
        q = q.outerjoin(User, Organization.owner_user_id == User.id).filter(
            or_(Organization.name.ilike(like), User.email.ilike(like))
        ).distinct()
    total = q.count()
    orgs = q.order_by(Organization.created_at.desc()).offset(offset).limit(limit).all()

    owners = {}
    if orgs:
        owner_rows = (
            db.query(User.id, User.email)
            .filter(User.id.in_({o.owner_user_id for o in orgs}))
            .all()
        )
        owners = {u.id: u.email for u in owner_rows}
    modes = {}
    if orgs:
        for org_id, mode, paused in (
            db.query(OrgSettings.org_id, OrgSettings.operation_mode, OrgSettings.pause_all)
            .filter(OrgSettings.org_id.in_({o.id for o in orgs}))
            .all()
        ):
            modes[org_id] = (mode, paused)

    return {
        "total": total,
        "items": [
            {
                "id": o.id,
                "name": o.name,
                "plan": normalize_plan(o.plan),
                "billing_period": o.billing_period,
                "owner_email": owners.get(o.owner_user_id),
                "operation_mode": modes.get(o.id, (None, None))[0],
                "paused": bool(modes.get(o.id, (None, None))[1]),
                "collections_used": o.collections_used_this_period,
                "collections_quota": o.collections_quota,
                "whatsapp_used": o.whatsapp_used_this_period,
                "whatsapp_quota": o.whatsapp_quota,
                "created_at": o.created_at,
            }
            for o in orgs
        ],
    }


@router.get("/orgs/{org_id}", dependencies=[Depends(_READ_LIMIT)])
def org_detail(
    org_id: str,
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    org = _org_base(db, org_id)
    owner = db.query(User).filter(User.id == org.owner_user_id).first()
    now = datetime.now(timezone.utc)
    connections = (
        db.query(Connection).filter(Connection.org_id == org.id).order_by(Connection.created_at.desc()).all()
    )
    sub = (
        db.query(Subscription)
        .filter(Subscription.org_id == org.id)
        .order_by(Subscription.created_at.desc())
        .first()
    )
    os_row = db.query(OrgSettings).filter(OrgSettings.org_id == org.id).first()

    def _count(*conds):
        return db.query(Invoice).filter(Invoice.org_id == org.id, *conds).count()

    unpaid_open = _count(Invoice.status.in_(["unpaid", "chasing"]), Invoice.balance > 0)
    return {
        "org": {
            "id": org.id,
            "name": org.name,
            "plan": normalize_plan(org.plan),
            "billing_period": org.billing_period,
            "seats_limit": org.seats_limit,
            "paddle_customer_id": org.paddle_customer_id,
            "collections_used": org.collections_used_this_period,
            "collections_quota": org.collections_quota,
            "whatsapp_used": org.whatsapp_used_this_period,
            "whatsapp_quota": org.whatsapp_quota,
            "deletion_requested_at": org.deletion_requested_at,
            "created_at": org.created_at,
        },
        "owner": {"id": owner.id, "email": owner.email, "full_name": owner.full_name} if owner else None,
        "settings": {
            "operation_mode": os_row.operation_mode if os_row else None,
            "pause_all": os_row.pause_all if os_row else False,
            "pause_until": os_row.pause_until if os_row else None,
            "pause_reason": os_row.pause_reason if os_row else None,
        },
        "connections": [_connection_dict(c, now) for c in connections],
        "subscription": {
            "plan": sub.plan,
            "status": sub.status,
            "current_period_end": sub.current_period_end,
            "cancel_at_period_end": sub.cancel_at_period_end,
        } if sub else None,
        "counts": {
            "invoices_total": _count(),
            "invoices_unpaid": _count(Invoice.status == "unpaid"),
            "invoices_chasing": _count(Invoice.status == "chasing"),
            "invoices_paid": _count(Invoice.status == "paid"),
            "unpaid_open": unpaid_open,
            "unpaid_amount": float(
                db.query(func.coalesce(func.sum(Invoice.balance), 0))
                .filter(Invoice.org_id == org.id, Invoice.status.in_(["unpaid", "chasing"]))
                .scalar() or 0
            ),
            "messages": db.query(Message).filter(Message.org_id == org.id).count(),
            "pending_jobs": db.query(ReminderJob).filter(
                ReminderJob.org_id == org.id, ReminderJob.status == "pending"
            ).count(),
        },
    }


@router.get("/orgs/{org_id}/audit", dependencies=[Depends(_READ_LIMIT)])
def org_audit(
    org_id: str,
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    limit: int = Query(20, ge=1, le=200),
):
    items = (
        db.query(AuditLog)
        .filter(AuditLog.org_id == org_id)
        .order_by(AuditLog.created_at.desc())
        .limit(limit)
        .all()
    )
    return {
        "items": [
            {
                "id": a.id,
                "actor_type": a.actor_type,
                "actor_id": a.actor_id,
                "action": a.action,
                "entity_type": a.entity_type,
                "entity_id": a.entity_id,
                "details": a.details,
                "ip": a.ip,
                "created_at": a.created_at,
            }
            for a in items
        ]
    }


@router.post("/orgs/{org_id}/impersonate", dependencies=[Depends(_ACTION_LIMIT)])
def impersonate(
    org_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    org = _org_base(db, org_id)
    owner = db.query(User).filter(User.id == org.owner_user_id).first()
    if not owner:
        raise HTTPException(status_code=404, detail="Owner not found")
    _audit(db, admin, "admin.impersonate", "organization", org_id, org_id=org_id,
           details={"owner_email": owner.email})
    token = create_access_token(owner.id, org.id, owner.email)
    return {"access_token": token, "token_type": "bearer", "expires_in_minutes": 15}


@router.post("/orgs/{org_id}/pause-reminders", dependencies=[Depends(_ACTION_LIMIT)])
def pause_reminders(
    org_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    reason: Optional[str] = Query(None, max_length=200),
    minutes: Optional[int] = Query(None, ge=1, le=60 * 24 * 30),
):
    org = _org_base(db, org_id)
    row = get_or_create_org_settings(db, org_id)
    row.pause_all = True
    row.pause_reason = reason or "paused by admin"
    if minutes:
        row.pause_until = datetime.now(timezone.utc) + timedelta(minutes=minutes)
    jobs_cancelled = (
        db.query(ReminderJob)
        .filter(ReminderJob.org_id == org_id, ReminderJob.status == "pending")
        .update({ReminderJob.status: "cancelled"}, synchronize_session=False)
    )
    db.commit()
    _audit(db, admin, "admin.pause_reminders", "organization", org_id, org_id=org_id,
           details={"reason": row.pause_reason, "jobs_cancelled": jobs_cancelled})
    return {"ok": True, "jobs_cancelled": jobs_cancelled}


@router.post("/orgs/{org_id}/resume-reminders", dependencies=[Depends(_ACTION_LIMIT)])
def resume_reminders(
    org_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    org = _org_base(db, org_id)
    row = get_or_create_org_settings(db, org_id)
    row.pause_all = False
    row.pause_until = None
    row.pause_reason = None
    db.commit()
    _audit(db, admin, "admin.resume_reminders", "organization", org_id, org_id=org_id)
    return {"ok": True}


@router.post("/orgs/{org_id}/force-sync", dependencies=[Depends(_ACTION_LIMIT)])
def force_sync(
    org_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    org = _org_base(db, org_id)
    connections = (
        db.query(Connection)
        .filter(Connection.org_id == org.id, Connection.status == "active")
        .all()
    )
    if not connections:
        raise HTTPException(status_code=400, detail="No active connections for this org")
    for i, conn in enumerate(connections):
        celery_app.send_task(
            "app.tasks.sync_invoices.sync_invoices_task", args=[conn.id], countdown=i * 5
        )
    _audit(db, admin, "admin.force_sync", "organization", org_id, org_id=org_id,
           details={"connections": len(connections)})
    return {"ok": True, "enqueued": len(connections)}


@router.post("/orgs/{org_id}/reset-counters", dependencies=[Depends(_ACTION_LIMIT)])
def reset_counters(
    org_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    org = _org_base(db, org_id)
    org.collections_used_this_period = 0
    org.whatsapp_used_this_period = 0
    db.commit()
    _audit(db, admin, "admin.reset_counters", "organization", org_id, org_id=org_id)
    return {"ok": True}


class PlanRequest(BaseModel):
    plan: str
    billing_period: Optional[str] = None


@router.patch("/orgs/{org_id}/plan", dependencies=[Depends(_ACTION_LIMIT)])
def change_plan(
    org_id: str,
    body: PlanRequest,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    org = _org_base(db, org_id)
    plan = normalize_plan(body.plan)
    if plan != body.plan or plan not in PLAN_PRICES:
        raise HTTPException(status_code=400, detail=f"Unknown plan: {body.plan}")
    if body.billing_period not in (None, "monthly", "annual"):
        raise HTTPException(status_code=400, detail="billing_period must be monthly|annual")
    old_plan = normalize_plan(org.plan)
    org.plan = plan
    if body.billing_period:
        org.billing_period = body.billing_period
    apply_plan_quotas(org)
    db.commit()
    _audit(db, admin, "admin.change_plan", "organization", org_id, org_id=org_id,
           details={"from": old_plan, "to": plan, "billing_period": org.billing_period})
    return {"ok": True, "plan": plan, "billing_period": org.billing_period}


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

@router.get("/users", dependencies=[Depends(_READ_LIMIT)])
def list_users(
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    search: Optional[str] = Query(None, max_length=120),
    limit: int = Query(25, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    q = db.query(User)
    if search:
        like = f"%{search.strip()}%"
        q = q.filter(or_(User.email.ilike(like), User.full_name.ilike(like)))
    total = q.count()
    users = q.order_by(User.created_at.desc()).offset(offset).limit(limit).all()

    orgs_by_owner = {}
    if users:
        for oid, owner_id, name, plan in (
            db.query(Organization.id, Organization.owner_user_id, Organization.name, Organization.plan)
            .filter(Organization.owner_user_id.in_({u.id for u in users}))
            .all()
        ):
            orgs_by_owner.setdefault(owner_id, []).append(
                {"id": oid, "name": name, "plan": normalize_plan(plan)}
            )
    return {
        "total": total,
        "items": [
            {
                "id": u.id,
                "email": u.email,
                "full_name": u.full_name,
                "is_active": u.is_active,
                "is_deleting": u.is_deleting,
                "created_at": u.created_at,
                "deleted_at": getattr(u, "deleted_at", None),
                "orgs": orgs_by_owner.get(u.id, []),
            }
            for u in users
        ],
    }


@router.get("/users/{user_id}", dependencies=[Depends(_READ_LIMIT)])
def user_detail(
    user_id: str,
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    orgs = db.query(Organization).filter(Organization.owner_user_id == user.id).all()
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "is_active": user.is_active,
        "is_deleting": user.is_deleting,
        "gdpr_consent_at": user.gdpr_consent_at,
        "created_at": user.created_at,
        "deleted_at": getattr(user, "deleted_at", None),
        "orgs": [
            {
                "id": o.id,
                "name": o.name,
                "plan": normalize_plan(o.plan),
                "collections_used": o.collections_used_this_period,
                "collections_quota": o.collections_quota,
                "whatsapp_used": o.whatsapp_used_this_period,
                "whatsapp_quota": o.whatsapp_quota,
                "deletion_requested_at": o.deletion_requested_at,
            }
            for o in orgs
        ],
    }


def _reject_admin_suspension(target: User):
    if target.email.lower() in _admin_emails():
        raise HTTPException(
            status_code=400,
            detail="Cannot suspend an admin (ADMIN_EMAILS member) — would lock you out of the console",
        )


@router.post("/users/{user_id}/suspend", dependencies=[Depends(_ACTION_LIMIT)])
def suspend_user(
    user_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _reject_admin_suspension(user)
    user.is_active = False
    db.commit()
    _audit(db, admin, "admin.suspend_user", "user", user.id, details={"email": user.email})
    return {"ok": True, "is_active": False}


@router.post("/users/{user_id}/unsuspend", dependencies=[Depends(_ACTION_LIMIT)])
def unsuspend_user(
    user_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_active = True
    db.commit()
    _audit(db, admin, "admin.unsuspend_user", "user", user.id, details={"email": user.email})
    return {"ok": True, "is_active": True}


@router.post("/users/{user_id}/request-deletion", dependencies=[Depends(_ACTION_LIMIT)])
def request_user_deletion(
    user_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    """Start the same 30-day GDPR grace flow the user can start themselves."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    _reject_admin_suspension(user)
    user.is_deleting = True
    org = db.query(Organization).filter(Organization.owner_user_id == user.id).first()
    if org:
        org.deletion_requested_at = datetime.now(timezone.utc)
    db.commit()
    _audit(db, admin, "admin.request_deletion", "user", user.id,
           org_id=org.id if org else None, details={"email": user.email})
    return {"ok": True, "grace_days": 30}


@router.post("/users/{user_id}/cancel-deletion", dependencies=[Depends(_ACTION_LIMIT)])
def cancel_user_deletion(
    user_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.is_deleting = False
    orgs = db.query(Organization).filter(Organization.owner_user_id == user.id).all()
    for org in orgs:
        org.deletion_requested_at = None
    db.commit()
    _audit(db, admin, "admin.cancel_deletion", "user", user.id, details={"email": user.email})
    return {"ok": True}


# ---------------------------------------------------------------------------
# Jobs console
# ---------------------------------------------------------------------------

def _job_dict(j: ReminderJob, invoice_number: Optional[str], org_name: Optional[str],
              now: datetime) -> dict:
    upd = _utc(j.updated_at)
    return {
        "id": j.id,
        "org_id": j.org_id,
        "org_name": org_name,
        "invoice_id": j.invoice_id,
        "invoice_number": invoice_number,
        "sequence_step": j.sequence_step,
        "scheduled_for": j.scheduled_for,
        "status": j.status,
        "attempts": j.attempts,
        "last_error": j.last_error,
        "updated_at": j.updated_at,
        "stuck": bool(j.status == "processing" and upd and upd <= _stuck_cutoff(now)),
    }


@router.get("/jobs", dependencies=[Depends(_READ_LIMIT)])
def list_jobs(
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    status_f: Optional[str] = Query(None, alias="status"),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    now = datetime.now(timezone.utc)
    q = db.query(ReminderJob, Invoice.number, Organization.name).outerjoin(
        Invoice, ReminderJob.invoice_id == Invoice.id
    ).outerjoin(Organization, ReminderJob.org_id == Organization.id)
    if status_f == "stuck":
        q = q.filter(ReminderJob.status == "processing",
                     ReminderJob.updated_at <= _stuck_cutoff(now))
    elif status_f:
        q = q.filter(ReminderJob.status == status_f)
    if org_id:
        q = q.filter(ReminderJob.org_id == org_id)
    total = q.count()
    rows = q.order_by(ReminderJob.scheduled_for.desc()).offset(offset).limit(limit).all()

    def _cnt(st, extra=None):
        f = db.query(ReminderJob).filter(ReminderJob.status == st)
        if extra is not None:
            f = f.filter(extra)
        return f.count()

    return {
        "total": total,
        "counts": {
            "pending": _cnt("pending"),
            "processing": _cnt("processing"),
            "sent": _cnt("sent"),
            "failed": _cnt("failed"),
            "cancelled": _cnt("cancelled"),
            "stuck": _cnt("processing", ReminderJob.updated_at <= _stuck_cutoff(now)),
        },
        "items": [_job_dict(j, number, org_name, now) for j, number, org_name in rows],
    }


@router.post("/jobs/{job_id}/requeue", dependencies=[Depends(_ACTION_LIMIT)])
def requeue_job(
    job_id: str,
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    job = db.query(ReminderJob).filter(ReminderJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    if job.status not in ("failed", "processing", "cancelled"):
        raise HTTPException(status_code=400, detail=f"Job is '{job.status}', nothing to requeue")
    job.status = "pending"
    job.scheduled_for = datetime.now(timezone.utc)
    job.attempts = 0
    job.last_error = None
    db.commit()
    _audit(db, admin, "admin.requeue_job", "reminder_job", job.id, org_id=job.org_id)
    return {"ok": True}


@router.post("/jobs/requeue-stuck", dependencies=[Depends(_ACTION_LIMIT)])
def requeue_stuck(
    admin: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
):
    now = datetime.now(timezone.utc)
    stuck = (
        db.query(ReminderJob)
        .filter(ReminderJob.status == "processing", ReminderJob.updated_at <= _stuck_cutoff(now))
        .limit(500)
        .all()
    )
    for job in stuck:
        job.status = "pending"
        job.scheduled_for = now
        job.attempts = 0
        job.last_error = None
    db.commit()
    _audit(db, admin, "admin.requeue_stuck", "reminder_job",
           details={"requeued": len(stuck)})
    return {"ok": True, "requeued": len(stuck)}


# ---------------------------------------------------------------------------
# Audit log
# ---------------------------------------------------------------------------

@router.get("/audit-log", dependencies=[Depends(_READ_LIMIT)])
def audit_log(
    _: dict = Depends(require_admin_flexible),
    db: Session = Depends(get_db),
    org_id: Optional[str] = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
):
    q = db.query(AuditLog)
    if org_id:
        q = q.filter(AuditLog.org_id == org_id)
    total = q.count()
    items = q.order_by(AuditLog.created_at.desc()).offset(offset).limit(limit).all()
    return {
        "total": total,
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
                "ip": a.ip,
                "created_at": a.created_at,
            }
            for a in items
        ],
    }

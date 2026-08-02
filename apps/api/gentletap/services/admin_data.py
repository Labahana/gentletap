"""Read-only admin aggregates — no secrets exposed."""

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import func, or_
from sqlalchemy.orm import Session, aliased

from gentletap.database import (
    AdminAuditLog,
    FreshBooksConnection,
    GoogleConnection,
    Invoice,
    Profile,
    QuickBooksConnection,
    ReminderJob,
    ReminderMessage,
    SyncLog,
    WhatsappConnection,
)
from gentletap.services.email_router import has_delivery_capability

STUCK_JOB_MINUTES = 15


def _iso(dt) -> str | None:
    return dt.isoformat() if dt else None


def build_admin_overview(db: Session) -> dict:
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    stuck_cutoff = now - timedelta(minutes=STUCK_JOB_MINUTES)

    total_users = db.query(func.count(Profile.id)).scalar() or 0
    live_users = (
        db.query(func.count(Profile.id)).filter(Profile.onboarding_step == "live").scalar() or 0
    )
    reminders_sent_today = (
        db.query(func.count(ReminderMessage.id))
        .filter(ReminderMessage.status == "sent", ReminderMessage.sent_at >= today_start)
        .scalar()
        or 0
    )
    pending_jobs = (
        db.query(func.count(ReminderJob.id)).filter(ReminderJob.status == "pending").scalar() or 0
    )
    processing_jobs = (
        db.query(func.count(ReminderJob.id)).filter(ReminderJob.status == "processing").scalar() or 0
    )
    stuck_jobs = (
        db.query(func.count(ReminderJob.id))
        .filter(ReminderJob.status == "processing", ReminderJob.updated_at < stuck_cutoff)
        .scalar()
        or 0
    )
    failed_jobs = (
        db.query(func.count(ReminderJob.id)).filter(ReminderJob.status == "failed").scalar() or 0
    )
    qb_connected = (
        db.query(func.count(QuickBooksConnection.id))
        .filter(QuickBooksConnection.disconnected_at.is_(None))
        .scalar()
        or 0
    )
    fb_connected = (
        db.query(func.count(FreshBooksConnection.id))
        .filter(FreshBooksConnection.disconnected_at.is_(None))
        .scalar()
        or 0
    )
    google_connected = (
        db.query(func.count(GoogleConnection.id))
        .filter(GoogleConnection.disconnected_at.is_(None))
        .scalar()
        or 0
    )
    active_sequences = (
        db.query(func.count(Invoice.id)).filter(Invoice.sequence_active.is_(True)).scalar() or 0
    )

    recent_signups = (
        db.query(Profile)
        .order_by(Profile.created_at.desc())
        .limit(8)
        .all()
    )

    return {
        "total_users": total_users,
        "live_users": live_users,
        "reminders_sent_today": reminders_sent_today,
        "pending_jobs": pending_jobs,
        "processing_jobs": processing_jobs,
        "stuck_jobs": stuck_jobs,
        "failed_jobs": failed_jobs,
        "qb_connected": qb_connected,
        "fb_connected": fb_connected,
        "google_connected": google_connected,
        "active_sequences": active_sequences,
        "recent_signups": [
            {
                "id": str(u.id),
                "email": u.email,
                "plan": u.plan,
                "onboarding_step": u.onboarding_step,
                "created_at": _iso(u.created_at),
            }
            for u in recent_signups
        ],
    }


def search_admin_users(
    db: Session,
    *,
    search: str | None,
    plan: str | None = None,
    onboarding_step: str | None = None,
    limit: int,
    offset: int,
) -> dict:
    q = db.query(Profile)
    if search and search.strip():
        term = f"%{search.strip().lower()}%"
        q = q.filter(
            or_(
                func.lower(Profile.email).like(term),
                func.lower(Profile.company_name).like(term),
                func.lower(Profile.full_name).like(term),
            )
        )
    if plan and plan.strip():
        q = q.filter(Profile.plan == plan.strip().lower())
    if onboarding_step and onboarding_step.strip():
        q = q.filter(Profile.onboarding_step == onboarding_step.strip())
    total = q.count()
    rows = q.order_by(Profile.created_at.desc()).offset(offset).limit(limit).all()

    user_ids = [u.id for u in rows]
    qb_map: dict = {}
    fb_map: dict = {}
    google_map: dict = {}
    if user_ids:
        qb_map = {
            r.user_id: r
            for r in db.query(QuickBooksConnection).filter(QuickBooksConnection.user_id.in_(user_ids)).all()
        }
        fb_map = {
            r.user_id: r
            for r in db.query(FreshBooksConnection).filter(FreshBooksConnection.user_id.in_(user_ids)).all()
        }
        google_map = {
            r.user_id: r
            for r in db.query(GoogleConnection).filter(GoogleConnection.user_id.in_(user_ids)).all()
        }

    items = []
    for user in rows:
        qb = qb_map.get(user.id)
        fb = fb_map.get(user.id)
        google = google_map.get(user.id)
        last_sync_candidates = [
            dt
            for dt in (
                qb.last_sync_at if qb and qb.disconnected_at is None else None,
                fb.last_sync_at if fb and fb.disconnected_at is None else None,
            )
            if dt is not None
        ]
        last_sync_at = max(last_sync_candidates).isoformat() if last_sync_candidates else None
        items.append(
            {
                "id": str(user.id),
                "email": user.email,
                "company_name": user.company_name,
                "full_name": user.full_name,
                "plan": user.plan,
                "onboarding_step": user.onboarding_step,
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "qb_connected": qb is not None and qb.disconnected_at is None,
                "fb_connected": fb is not None and fb.disconnected_at is None,
                "google_connected": google is not None and google.disconnected_at is None,
                "last_sync_at": last_sync_at,
            }
        )
    return {"items": items, "total": total, "limit": limit, "offset": offset}


def get_admin_user_detail(db: Session, user_id: UUID) -> dict | None:
    user = db.query(Profile).filter(Profile.id == user_id).one_or_none()
    if user is None:
        return None

    qb = db.query(QuickBooksConnection).filter(QuickBooksConnection.user_id == user.id).one_or_none()
    fb = db.query(FreshBooksConnection).filter(FreshBooksConnection.user_id == user.id).one_or_none()
    google = db.query(GoogleConnection).filter(GoogleConnection.user_id == user.id).one_or_none()
    wa = db.query(WhatsappConnection).filter(WhatsappConnection.user_id == user.id).one_or_none()

    unpaid_invoices = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.balance > 0)
        .scalar()
        or 0
    )
    active_sequences = (
        db.query(func.count(Invoice.id))
        .filter(Invoice.user_id == user.id, Invoice.sequence_active.is_(True))
        .scalar()
        or 0
    )
    reminders_sent = (
        db.query(func.count(ReminderMessage.id))
        .join(Invoice, ReminderMessage.invoice_id == Invoice.id)
        .filter(Invoice.user_id == user.id, ReminderMessage.status == "sent")
        .scalar()
        or 0
    )

    recent_syncs = (
        db.query(SyncLog)
        .filter(SyncLog.user_id == user.id)
        .order_by(SyncLog.created_at.desc())
        .limit(5)
        .all()
    )
    recent_failed_jobs = (
        db.query(ReminderJob, Invoice)
        .join(Invoice, ReminderJob.invoice_id == Invoice.id)
        .filter(Invoice.user_id == user.id, ReminderJob.status == "failed")
        .order_by(ReminderJob.updated_at.desc())
        .limit(5)
        .all()
    )

    return {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "company_name": user.company_name,
        "plan": user.plan,
        "onboarding_step": user.onboarding_step,
        "onboarding_completed_at": _iso(user.onboarding_completed_at),
        "timezone": user.timezone,
        "created_at": _iso(user.created_at),
        "delivery_ready": has_delivery_capability(db, user.id, plan=user.plan),
        "stats": {
            "unpaid_invoices": unpaid_invoices,
            "active_sequences": active_sequences,
            "reminders_sent": reminders_sent,
        },
        "quickbooks": None
        if qb is None
        else {
            "connected": qb.disconnected_at is None,
            "realm_id": qb.realm_id[:8] + "…" if qb.realm_id else None,
            "last_sync_at": _iso(qb.last_sync_at),
            "token_expires_at": _iso(qb.token_expires_at),
            "connected_at": _iso(qb.connected_at),
        },
        "freshbooks": None
        if fb is None
        else {
            "connected": fb.disconnected_at is None,
            "account_id": fb.account_id,
            "business_name": fb.business_name,
            "last_sync_at": _iso(fb.last_sync_at),
            "token_expires_at": _iso(fb.token_expires_at),
            "connected_at": _iso(fb.connected_at),
        },
        "google": None
        if google is None
        else {
            "connected": google.disconnected_at is None,
            "email": google.google_email,
            "token_expires_at": _iso(google.token_expires_at),
            "connected_at": _iso(google.connected_at),
        },
        "whatsapp": None
        if wa is None
        else {
            "connected": wa.disconnected_at is None,
            "phone_e164": wa.phone_e164,
            "status": wa.status,
            "connected_at": _iso(wa.connected_at),
        },
        "recent_syncs": [
            {
                "source": row.source,
                "status": row.status,
                "message": row.message,
                "invoices_synced": row.invoices_synced,
                "created_at": _iso(row.created_at),
            }
            for row in recent_syncs
        ],
        "recent_failed_jobs": [
            {
                "job_id": str(job.id),
                "invoice_id": str(inv.id),
                "doc_number": inv.doc_number,
                "sequence_step": job.sequence_step,
                "updated_at": _iso(job.updated_at),
            }
            for job, inv in recent_failed_jobs
        ],
    }


def list_admin_jobs(db: Session, *, status: str, limit: int) -> dict:
    now = datetime.now(UTC)
    stuck_cutoff = now - timedelta(minutes=STUCK_JOB_MINUTES)

    q = (
        db.query(ReminderJob, Invoice, Profile)
        .join(Invoice, ReminderJob.invoice_id == Invoice.id)
        .join(Profile, Invoice.user_id == Profile.id)
    )
    if status == "stuck":
        q = q.filter(ReminderJob.status == "processing", ReminderJob.updated_at < stuck_cutoff)
    elif status == "all":
        pass
    else:
        q = q.filter(ReminderJob.status == status)

    rows = q.order_by(ReminderJob.updated_at.desc()).limit(limit).all()
    return {
        "items": [
            {
                "job_id": str(job.id),
                "status": job.status,
                "sequence_step": job.sequence_step,
                "scheduled_for": _iso(job.scheduled_for),
                "updated_at": _iso(job.updated_at),
                "celery_task_id": job.celery_task_id,
                "invoice_id": str(inv.id),
                "doc_number": inv.doc_number,
                "user_id": str(user.id),
                "user_email": user.email,
                "stuck": job.status == "processing" and job.updated_at < stuck_cutoff,
            }
            for job, inv, user in rows
        ],
        "status_filter": status,
        "limit": limit,
    }


def list_admin_audit_log(db: Session, *, limit: int, offset: int) -> dict:
    AdminProfile = aliased(Profile)
    TargetProfile = aliased(Profile)

    q = (
        db.query(AdminAuditLog, AdminProfile, TargetProfile)
        .join(AdminProfile, AdminAuditLog.admin_user_id == AdminProfile.id)
        .outerjoin(TargetProfile, AdminAuditLog.target_user_id == TargetProfile.id)
    )
    total = q.count()
    rows = q.order_by(AdminAuditLog.created_at.desc()).offset(offset).limit(limit).all()

    return {
        "items": [
            {
                "id": str(log.id),
                "action": log.action,
                "admin_email": admin.email,
                "target_user_id": str(log.target_user_id) if log.target_user_id else None,
                "target_email": target.email if target else None,
                "ip_address": log.ip_address,
                "metadata": log.metadata_json,
                "created_at": _iso(log.created_at),
            }
            for log, admin, target in rows
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }

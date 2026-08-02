"""Platform admin API — allowlisted superadmin only; returns 404 for everyone else."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from gentletap.database import get_db
from gentletap.dependencies import AdminUser
from gentletap.rate_limit import limiter
from gentletap.services.admin_actions import (
    admin_force_fb_sync,
    admin_force_qb_sync,
    admin_pause_user_reminders,
    admin_requeue_job,
    admin_requeue_stuck_jobs,
)
from gentletap.services.admin_data import (
    build_admin_overview,
    get_admin_user_detail,
    list_admin_audit_log,
    list_admin_jobs,
    search_admin_users,
)
from gentletap.services.admin_security import record_admin_action
from gentletap.utils.celery_health import celery_worker_status
from gentletap.utils.redis_client import get_redis

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/me")
@limiter.limit("60/minute")
def admin_me(request: Request, admin: AdminUser) -> dict:
    return {"admin": True, "email": admin.email, "id": str(admin.id)}


@router.get("/overview")
@limiter.limit("30/minute")
def admin_overview(request: Request, admin: AdminUser, db: Session = Depends(get_db)) -> dict:
    return build_admin_overview(db)


@router.get("/health")
@limiter.limit("30/minute")
def admin_health(request: Request, admin: AdminUser, db: Session = Depends(get_db)) -> dict:
    checks: dict[str, str] = {}
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    try:
        checks["redis"] = "ok" if get_redis().ping() else "error"
    except Exception:
        checks["redis"] = "error"
    checks["celery_workers"] = celery_worker_status()
    return {"status": "ok" if checks.get("database") == "ok" else "degraded", "checks": checks}


@router.get("/users")
@limiter.limit("30/minute")
def admin_users(
    request: Request,
    admin: AdminUser,
    db: Session = Depends(get_db),
    search: str | None = Query(None),
    plan: str | None = Query(None),
    onboarding_step: str | None = Query(None),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    return search_admin_users(
        db,
        search=search,
        plan=plan,
        onboarding_step=onboarding_step,
        limit=limit,
        offset=offset,
    )


@router.get("/audit")
@limiter.limit("30/minute")
def admin_audit_log(
    request: Request,
    admin: AdminUser,
    db: Session = Depends(get_db),
    limit: int = Query(50, le=100),
    offset: int = Query(0, ge=0),
) -> dict:
    result = list_admin_audit_log(db, limit=limit, offset=offset)
    record_admin_action(
        db,
        admin=admin,
        action="audit.view",
        request=request,
        metadata={"offset": offset, "limit": limit},
    )
    return result


@router.get("/users/{user_id}")
@limiter.limit("30/minute")
def admin_user_detail(
    request: Request,
    user_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    detail = get_admin_user_detail(db, user_id)
    if detail is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    record_admin_action(
        db,
        admin=admin,
        action="user.view",
        request=request,
        target_user_id=user_id,
    )
    return detail


@router.get("/jobs")
@limiter.limit("30/minute")
def admin_jobs(
    request: Request,
    admin: AdminUser,
    db: Session = Depends(get_db),
    status: str = Query("failed"),
    limit: int = Query(50, le=100),
) -> dict:
    allowed = {"failed", "pending", "processing", "stuck", "all"}
    if status not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter")
    return list_admin_jobs(db, status=status, limit=limit)


@router.post("/users/{user_id}/sync-qb")
@limiter.limit("10/minute")
def admin_sync_qb(
    request: Request,
    user_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    if get_admin_user_detail(db, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    result = admin_force_qb_sync(user_id)
    record_admin_action(
        db,
        admin=admin,
        action="user.sync_qb",
        request=request,
        target_user_id=user_id,
    )
    return result


@router.post("/users/{user_id}/sync-fb")
@limiter.limit("10/minute")
def admin_sync_fb(
    request: Request,
    user_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    if get_admin_user_detail(db, user_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    result = admin_force_fb_sync(user_id)
    record_admin_action(
        db,
        admin=admin,
        action="user.sync_fb",
        request=request,
        target_user_id=user_id,
    )
    return result


@router.post("/users/{user_id}/pause-reminders")
@limiter.limit("10/minute")
def admin_pause_reminders(
    request: Request,
    user_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    result = admin_pause_user_reminders(db, user_id)
    if result.get("status") == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    record_admin_action(
        db,
        admin=admin,
        action="user.pause_reminders",
        request=request,
        target_user_id=user_id,
        metadata=result,
    )
    return result


@router.post("/jobs/{job_id}/requeue")
@limiter.limit("20/minute")
def admin_requeue_one(
    request: Request,
    job_id: UUID,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    result = admin_requeue_job(db, job_id)
    if result.get("status") == "not_found":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")
    record_admin_action(
        db,
        admin=admin,
        action="job.requeue",
        request=request,
        metadata={"job_id": str(job_id), **result},
    )
    return result


@router.post("/jobs/requeue-stuck")
@limiter.limit("5/minute")
def admin_requeue_stuck(
    request: Request,
    admin: AdminUser,
    db: Session = Depends(get_db),
) -> dict:
    result = admin_requeue_stuck_jobs(db)
    record_admin_action(
        db,
        admin=admin,
        action="jobs.requeue_stuck",
        request=request,
        metadata=result,
    )
    return result

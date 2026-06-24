from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import get_db
from gentletap.dependencies import CurrentUser
from gentletap.schemas.auth import HealthResponse, OnboardingPersonaRequest, OnboardingProfileRequest, UserResponse
from gentletap.utils.celery_health import celery_worker_status
from gentletap.utils.redis_client import get_redis

router = APIRouter(tags=["core"])


@router.get("/health", response_model=HealthResponse)
def health(db: Session = Depends(get_db)) -> HealthResponse:
    settings = get_settings()
    checks: dict[str, str] = {}
    try:
        db.execute(text("SELECT 1"))
        checks["database"] = "ok"
    except Exception:
        checks["database"] = "error"
    try:
        if get_redis().ping():
            checks["redis"] = "ok"
    except Exception:
        checks["redis"] = "error"
    checks["celery_workers"] = celery_worker_status()
    required = ("database", "redis")
    status = "ok" if all(checks.get(k) == "ok" for k in required) else "degraded"
    return HealthResponse(status=status, environment=settings.environment, checks=checks)


ONBOARDING_STEPS = ["account", "invoice_import", "email", "preview", "pricing", "live"]


def _validate_logo_url(value: str | None) -> str | None:
    if value is None or not value.strip():
        return None
    trimmed = value.strip()
    if not trimmed.startswith("data:image/"):
        raise ValueError("Logo must be a PNG or JPG image")
    if len(trimmed) > 400_000:
        raise ValueError("Logo file is too large — use PNG or JPG under 600×600 px")
    return trimmed


@router.post("/onboarding/profile", response_model=UserResponse)
def save_onboarding_profile(
    body: OnboardingProfileRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> UserResponse:
    from fastapi import HTTPException, status

    try:
        logo = _validate_logo_url(body.logo_url)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    user.company_name = body.company_name.strip()
    user.email_display_name = (body.email_display_name or "").strip() or None
    user.phone = (body.phone or "").strip() or None
    user.website = (body.website or "").strip() or None
    user.logo_url = logo
    if not user.persona:
        user.persona = "freelancer"
    if user.onboarding_step in ("account", "persona"):
        user.onboarding_step = "invoice_import"
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)


def _onboarding_step_index(step: str) -> int:
    legacy = {
        "persona": "account",
        "import": "preview",
        "quickbooks": "invoice_import",
    }
    normalized = legacy.get(step, step)
    try:
        return ONBOARDING_STEPS.index(normalized)
    except ValueError:
        return 0


@router.get("/onboarding/status")
def onboarding_status(user: CurrentUser) -> dict:
    return {
        "current_step": user.onboarding_step,
        "step_index": _onboarding_step_index(user.onboarding_step),
        "total_steps": len(ONBOARDING_STEPS) - 1,
        "completed": user.onboarding_completed_at is not None,
    }


@router.post("/onboarding/advance-import")
def advance_from_import(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if user.onboarding_step in ("invoice_import", "quickbooks"):
        user.onboarding_step = "email"
        db.commit()
    return {"current_step": user.onboarding_step}


@router.post("/onboarding/advance-quickbooks")
def advance_to_preview(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if user.onboarding_step == "email":
        user.onboarding_step = "preview"
        db.commit()
    return {"current_step": user.onboarding_step}


@router.post("/onboarding/advance-email")
def advance_to_email(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    """Legacy — navigate back to email setup from later steps."""
    if user.onboarding_step in ("preview", "import", "pricing"):
        user.onboarding_step = "email"
        db.commit()
    return {"current_step": user.onboarding_step}


@router.post("/onboarding/advance-pricing")
def advance_to_pricing(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if user.onboarding_step in ("preview", "import"):
        user.onboarding_step = "pricing"
        db.commit()
    return {"current_step": user.onboarding_step}


@router.post("/onboarding/activate", status_code=status.HTTP_202_ACCEPTED)
def activate_reminders(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    from gentletap.services.email_router import has_delivery_capability
    from gentletap.tasks.activation import queue_activation

    if not has_delivery_capability(db, user.id, plan=user.plan):
        from fastapi import HTTPException, status

        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect Gmail, verify an email sender, or connect WhatsApp before going live",
        )
    queue_activation(user.id)
    return {"status": "queued"}


@router.post("/onboarding/persona", response_model=UserResponse)
def set_persona(
    body: OnboardingPersonaRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> UserResponse:
    user.persona = body.persona
    if user.onboarding_step in ("account", "persona"):
        user.onboarding_step = "invoice_import"
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

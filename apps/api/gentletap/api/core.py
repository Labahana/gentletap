from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import get_db
from gentletap.dependencies import CurrentUser
from gentletap.schemas.auth import HealthResponse, OnboardingPersonaRequest, UserResponse
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
    status = "ok" if all(v == "ok" for v in checks.values()) else "degraded"
    return HealthResponse(status=status, environment=settings.environment, checks=checks)


ONBOARDING_STEPS = ["account", "email", "quickbooks", "preview", "pricing", "live"]


def _onboarding_step_index(step: str) -> int:
    legacy = {
        "persona": "account",
        "import": "preview",
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


@router.post("/onboarding/advance-pricing")
def advance_to_pricing(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    if user.onboarding_step in ("preview", "import"):
        user.onboarding_step = "pricing"
        db.commit()
    return {"current_step": user.onboarding_step}


@router.post("/onboarding/activate")
def activate_reminders(user: CurrentUser, db: Session = Depends(get_db)) -> dict:
    from gentletap.services.reminders import approve_all_overdue

    return approve_all_overdue(db, user)


@router.post("/onboarding/persona", response_model=UserResponse)
def set_persona(
    body: OnboardingPersonaRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> UserResponse:
    user.persona = body.persona
    user.onboarding_step = "email"
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from gentletap.config import get_settings
from gentletap.database import get_db
from gentletap.dependencies import CurrentUser
from gentletap.schemas.auth import HealthResponse, OnboardingPersonaRequest, UserResponse

router = APIRouter(tags=["core"])


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    settings = get_settings()
    return HealthResponse(status="ok", environment=settings.environment)


@router.get("/onboarding/status")
def onboarding_status(user: CurrentUser) -> dict:
    steps = ["account", "quickbooks", "import", "email", "preview", "live"]
    try:
        idx = steps.index(user.onboarding_step)
    except ValueError:
        idx = 0
    return {
        "current_step": user.onboarding_step,
        "step_index": idx,
        "total_steps": len(steps),
        "completed": user.onboarding_completed_at is not None,
    }


@router.post("/onboarding/persona", response_model=UserResponse)
def set_persona(
    body: OnboardingPersonaRequest,
    user: CurrentUser,
    db: Session = Depends(get_db),
) -> UserResponse:
    user.persona = body.persona
    db.commit()
    db.refresh(user)
    return UserResponse.model_validate(user)

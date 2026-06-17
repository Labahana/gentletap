from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: str | None
    persona: str | None
    plan: str
    onboarding_step: str
    onboarding_completed_at: datetime | None

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str = "1.0.0"


class OnboardingPersonaRequest(BaseModel):
    persona: str = Field(pattern="^(freelancer|consultant|agency)$")

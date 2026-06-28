from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)
    ref_code: str | None = Field(default=None, max_length=64)


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
    company_name: str | None = None
    email_display_name: str | None = None
    phone: str | None = None
    website: str | None = None
    logo_url: str | None = None
    persona: str | None
    plan: str
    onboarding_step: str
    onboarding_completed_at: datetime | None

    model_config = {"from_attributes": True}


class HealthResponse(BaseModel):
    status: str
    environment: str
    version: str = "1.0.0"
    checks: dict[str, str] | None = None


class OnboardingPersonaRequest(BaseModel):
    persona: str = Field(pattern="^(freelancer|consultant|agency)$")


class OnboardingProfileRequest(BaseModel):
    company_name: str = Field(min_length=1, max_length=255)
    email_display_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=400_000)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=16, max_length=128)
    password: str = Field(min_length=8, max_length=128)


class GoogleExchangeRequest(BaseModel):
    code: str = Field(min_length=16, max_length=128)


class UpdateProfileRequest(BaseModel):
    full_name: str | None = Field(default=None, max_length=255)
    company_name: str | None = Field(default=None, max_length=255)
    email_display_name: str | None = Field(default=None, max_length=255)
    phone: str | None = Field(default=None, max_length=50)
    website: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=400_000)
    persona: str | None = Field(default=None, pattern="^(freelancer|consultant|agency)$")


class ChangePasswordRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)

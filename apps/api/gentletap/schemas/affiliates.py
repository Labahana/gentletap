from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


class AffiliateApplyRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=255)
    channel_name: str | None = Field(default=None, max_length=255)
    channel_url: str | None = Field(default=None, max_length=512)
    payout_email: EmailStr | None = None
    application_note: str | None = Field(default=None, max_length=2000)


class AffiliateLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AffiliateRefreshRequest(BaseModel):
    refresh_token: str


class AffiliateTrackClickRequest(BaseModel):
    ref_code: str = Field(min_length=2, max_length=64)
    landing_path: str | None = Field(default=None, max_length=512)
    referrer: str | None = Field(default=None, max_length=1024)


class AffiliateAttributeRequest(BaseModel):
    ref_code: str = Field(min_length=2, max_length=64)


class AffiliateApproveRequest(BaseModel):
    ref_code: str | None = Field(default=None, max_length=64)


class AffiliatePayoutRequest(BaseModel):
    amount: float = Field(gt=0)
    method: str = Field(default="paypal", max_length=30)
    reference: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)


class AffiliatePublicResponse(BaseModel):
    id: UUID
    name: str
    email: str
    status: str
    ref_code: str | None
    commission_rate: float
    payout_email: str | None
    channel_name: str | None
    channel_url: str | None
    approved_at: datetime | None

    model_config = {"from_attributes": True}

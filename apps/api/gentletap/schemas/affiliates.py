from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field

PartnerType = Literal["creator", "accountant", "other"]
PayoutMethod = Literal["paypal", "wise", "bank_transfer"]


class AffiliateApplyRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=255)
    channel_name: str | None = Field(default=None, max_length=255)
    channel_url: str | None = Field(default=None, max_length=512)
    payout_email: EmailStr | None = None
    payout_method: PayoutMethod = "paypal"
    payout_details: str | None = Field(default=None, max_length=1000)
    partner_type: PartnerType = "creator"
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
    # Manual rate override (e.g. 0.40 founder tier for early affiliates).
    commission_rate: float | None = Field(default=None, gt=0, le=1)


class AffiliatePayoutRequest(BaseModel):
    amount: float = Field(gt=0)
    method: PayoutMethod = "paypal"
    reference: str | None = Field(default=None, max_length=255)
    notes: str | None = Field(default=None, max_length=2000)
    allow_below_minimum: bool = False


class AffiliatePublicResponse(BaseModel):
    id: UUID
    name: str
    email: str
    status: str
    ref_code: str | None
    commission_rate: float
    payout_email: str | None
    payout_method: str
    payout_details: str | None
    partner_type: str
    channel_name: str | None
    channel_url: str | None
    approved_at: datetime | None

    model_config = {"from_attributes": True}

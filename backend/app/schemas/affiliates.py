from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field

PartnerType = Literal["creator", "accountant", "other"]
PayoutMethod = Literal["paypal", "wise", "bank_transfer"]


class AffiliateApplyRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    name: str = Field(min_length=2, max_length=255)
    channel_name: Optional[str] = Field(default=None, max_length=255)
    channel_url: Optional[str] = Field(default=None, max_length=512)
    payout_email: Optional[EmailStr] = None
    payout_method: PayoutMethod = "paypal"
    payout_details: Optional[str] = Field(default=None, max_length=1000)
    partner_type: PartnerType = "creator"
    application_note: Optional[str] = Field(default=None, max_length=2000)


class AffiliateLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AffiliateRefreshRequest(BaseModel):
    refresh_token: str


class AffiliateTokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class AffiliateTrackClickRequest(BaseModel):
    ref_code: str = Field(min_length=2, max_length=64)
    landing_path: Optional[str] = Field(default=None, max_length=512)
    referrer: Optional[str] = Field(default=None, max_length=1024)


class AffiliateAttributeRequest(BaseModel):
    ref_code: str = Field(min_length=2, max_length=64)


class AffiliateApproveRequest(BaseModel):
    ref_code: Optional[str] = Field(default=None, max_length=64)
    # Manual rate override (e.g. 0.40 founder tier for early affiliates).
    commission_rate: Optional[float] = Field(default=None, gt=0, le=1)


class AffiliatePayoutRequest(BaseModel):
    amount: float = Field(gt=0)
    method: PayoutMethod = "paypal"
    reference: Optional[str] = Field(default=None, max_length=255)
    notes: Optional[str] = Field(default=None, max_length=2000)
    allow_below_minimum: bool = False


class AffiliatePublicResponse(BaseModel):
    id: str
    name: str
    email: str
    status: str
    ref_code: Optional[str]
    commission_rate: float
    payout_email: Optional[str]
    payout_method: str
    payout_details: Optional[str]
    partner_type: str
    channel_name: Optional[str]
    channel_url: Optional[str]
    approved_at: Optional[datetime]

    model_config = {"from_attributes": True}

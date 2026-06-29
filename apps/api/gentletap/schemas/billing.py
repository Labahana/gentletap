from typing import Literal

from pydantic import BaseModel, Field

PlanChoice = Literal["pro", "pro_plus", "team"]
IntervalChoice = Literal["month", "year"]


class CheckoutRequest(BaseModel):
    plan: PlanChoice = "pro"
    interval: IntervalChoice = "month"
    return_to: Literal["billing", "onboarding"] = "billing"


class CheckoutResponse(BaseModel):
    checkout_url: str = ""
    transaction_id: str = ""


class PaddleConfig(BaseModel):
    client_token: str = ""
    environment: str = "sandbox"


class PlanFeature(BaseModel):
    id: str
    name: str
    price_monthly: int
    price_annual: int
    active_sequence_limit: int | None
    monthly_collection_limit: int | None = None
    value_note: str | None = None
    features: list[str]
    checkout_monthly_available: bool = False
    checkout_annual_available: bool = False


class BillingStatusResponse(BaseModel):
    plan: str
    plan_display_name: str
    paddle_customer_id: str | None = None
    checkout_available: bool = False
    paddle: PaddleConfig = Field(default_factory=PaddleConfig)
    plans: list[PlanFeature] = Field(default_factory=list)

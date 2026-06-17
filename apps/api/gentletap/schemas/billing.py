from typing import Literal

from pydantic import BaseModel, Field

PlanChoice = Literal["pro", "pro_plus", "team"]
IntervalChoice = Literal["month", "year"]


class CheckoutRequest(BaseModel):
    plan: PlanChoice = "pro"
    interval: IntervalChoice = "month"


class PlanFeature(BaseModel):
    id: str
    name: str
    price_monthly: int
    price_annual: int
    active_sequence_limit: int | None
    features: list[str]
    checkout_monthly_available: bool = False
    checkout_annual_available: bool = False


class BillingStatusResponse(BaseModel):
    plan: str
    plan_display_name: str
    stripe_customer_id: str | None = None
    checkout_available: bool = False
    plans: list[PlanFeature] = Field(default_factory=list)

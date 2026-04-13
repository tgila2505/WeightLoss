from datetime import datetime

from pydantic import BaseModel


class SubscribeRequest(BaseModel):
    tier: str
    interval: str
    payment_method_id: str


class SubscribeResponse(BaseModel):
    subscription_id: str
    tier: str
    status: str
    current_period_end: datetime | None


class CancelResponse(BaseModel):
    cancel_at_period_end: bool
    current_period_end: datetime | None


class PaymentMethodRequest(BaseModel):
    payment_method_id: str


class BillingPortalResponse(BaseModel):
    url: str


class CapabilityMap(BaseModel):
    meal_plan_full: bool
    weekly_schedule: bool
    profile_edit: bool
    ai_plans: bool
    coaching_insights: bool
    goal_specific_plans: bool
    advanced_coaching: bool
    weekly_ai_report: bool


class BillingStatusResponse(BaseModel):
    tier: str
    interval: str
    status: str
    trial_active: bool
    past_due: bool
    cancel_at_period_end: bool
    current_period_end: datetime | None
    capabilities: CapabilityMap


class PricingPlanItem(BaseModel):
    tier: str
    interval: str | None
    price_cents: int
    display_name: str
    stripe_price_id: str | None = None


class PlansResponse(BaseModel):
    plans: list[PricingPlanItem]


class UsageItem(BaseModel):
    feature: str
    period_key: str
    count: int
    soft_limit: int | None
    hard_cap: int | None


class UsageResponse(BaseModel):
    usage: list[UsageItem]


class WebhookResponse(BaseModel):
    received: bool

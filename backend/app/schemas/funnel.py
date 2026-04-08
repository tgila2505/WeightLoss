import uuid
from typing import Any

from pydantic import BaseModel, EmailStr


# ── Session ────────────────────────────────────────────────────────────────
class CreateSessionRequest(BaseModel):
    name: str
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    goal_weight_kg: float
    timeline_weeks: int
    health_conditions: str = ""
    activity_level: str
    diet_pattern: str


class SessionCreatedResponse(BaseModel):
    session_id: str  # UUID as string, for display/debugging only (not the httpOnly cookie)


# ── Preview ────────────────────────────────────────────────────────────────
class PreviewResponse(BaseModel):
    name: str
    goal_weight_kg: float
    timeline_weeks: int
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    deficit_rate: int       # kcal/day deficit applied
    weekly_loss_kg_estimate: float


# ── Convert ────────────────────────────────────────────────────────────────
class ConvertRequest(BaseModel):
    email: EmailStr
    password: str
    payment_method_id: str
    tier: str = "pro"
    interval: str = "monthly"


class ConvertResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Events ─────────────────────────────────────────────────────────────────
class TrackEventRequest(BaseModel):
    event_name: str
    session_token: uuid.UUID | None = None
    properties: dict[str, Any] = {}


# ── Stats ──────────────────────────────────────────────────────────────────
class FunnelStatsResponse(BaseModel):
    landing_views: int
    onboarding_starts: int
    onboarding_completions: int
    preview_views: int
    upgrade_clicks: int
    conversions: int
    plans_generated: int


# ── Stripe Webhook ─────────────────────────────────────────────────────────
class StripeWebhookResponse(BaseModel):
    received: bool = True

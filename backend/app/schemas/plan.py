from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MealPlanItem(BaseModel):
    meal: str
    name: str


class ActivityPlanItem(BaseModel):
    title: str
    frequency: str


class LabInsightItem(BaseModel):
    test_name: str
    status: str
    summary: str


class RiskItem(BaseModel):
    code: str
    description: str
    status: str


class PlanAdherenceSignal(BaseModel):
    name: str
    completed: bool
    score: int | None = None


class PlanPayload(BaseModel):
    intent: str
    meals: list[MealPlanItem] = Field(default_factory=list)
    activity: list[ActivityPlanItem] = Field(default_factory=list)
    behavioral_actions: list[str] = Field(default_factory=list)
    lab_insights: list[LabInsightItem] = Field(default_factory=list)
    risks: list[RiskItem] = Field(default_factory=list)
    recommendations: list[str] = Field(default_factory=list)
    adherence_signals: list[PlanAdherenceSignal] = Field(default_factory=list)
    constraints_applied: list[str] = Field(default_factory=list)
    biomarker_adjustments: list[str] = Field(default_factory=list)


class PlanCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    status: str = Field(default="active", min_length=1, max_length=50)
    plan: PlanPayload


class PlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    title: str
    status: str
    plan: PlanPayload
    created_at: datetime
    updated_at: datetime

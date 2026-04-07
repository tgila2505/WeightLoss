import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class ProgressEntryCreate(BaseModel):
    weight_kg: float | None = Field(default=None, gt=0, lt=500)
    body_fat_pct: float | None = Field(default=None, ge=0, le=100)
    notes: str | None = None
    entry_date: date | None = None  # defaults to today


class ProgressEntryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: int
    entry_date: date
    weight_kg: float | None
    body_fat_pct: float | None
    source: str
    created_at: datetime


class ChartPoint(BaseModel):
    date: date
    weight_kg: float | None
    rolling_avg: float | None


class ProgressSummaryResponse(BaseModel):
    goal_weight_kg: float | None
    start_weight_kg: float | None
    current_weight_kg: float | None
    total_lost_kg: float | None
    goal_delta_kg: float | None
    goal_pct: int | None
    trend_slope_14d: float | None  # kg/week
    plateau_detected: bool
    estimated_weeks_remaining: int | None
    chart_data: list[ChartPoint]

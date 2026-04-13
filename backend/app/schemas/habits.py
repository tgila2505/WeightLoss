from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class CheckInCreate(BaseModel):
    mood: int = Field(ge=1, le=5)
    adherence: str = Field(pattern="^(on_track|partial|off_track)$")
    weight_kg: float | None = Field(default=None, gt=0, lt=500)
    notes: str | None = None


class StreakSummary(BaseModel):
    current: int
    longest: int
    milestone_earned: str | None = None


class CheckInResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    log_date: date
    streak: StreakSummary
    ai_feedback_status: str  # "generating" | "ready"
    ai_feedback: dict | None = None


class CheckInTodayResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    submitted: bool
    log_date: date | None = None
    mood: int | None = None
    adherence: str | None = None
    weight_kg: float | None = None
    ai_feedback: dict | None = None


class MealSuggestionResponse(BaseModel):
    meal_name: str
    foods: list[str]
    macros: dict[str, Any]
    prep_note: str | None = None
    cached: bool = False
    generated_at: datetime

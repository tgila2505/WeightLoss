from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class AdherenceRecordBase(BaseModel):
    item_type: str = Field(min_length=1, max_length=50)
    item_name: str = Field(min_length=1, max_length=255)
    completed: bool
    adherence_date: date
    score: int | None = Field(default=None, ge=0, le=100)


class AdherenceRecordCreate(AdherenceRecordBase):
    pass


class AdherenceRecordResponse(AdherenceRecordBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime


class AdaptiveAdjustment(BaseModel):
    meal_adjustment: str
    activity_adjustment: str
    action_adjustment: str


class AdherenceSummaryResponse(BaseModel):
    adherence_score: float
    consistency_level: str
    completed_records: int
    total_records: int
    adjustments: AdaptiveAdjustment
    plan_refresh_needed: bool = False

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class ProfileBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    age: int = Field(gt=0, le=150)
    gender: str | None = Field(default=None, min_length=1, max_length=50)
    height_cm: float | None = Field(default=None, gt=0, le=300)
    weight_kg: float | None = Field(default=None, gt=0, le=1000)
    goal_target_weight_kg: float | None = Field(default=None, gt=0, le=1000)
    goal_timeline_weeks: int | None = Field(default=None, gt=0, le=520)
    health_conditions: str | None = Field(default=None, max_length=500)
    activity_level: str | None = Field(default=None, min_length=1, max_length=50)
    sleep_hours: float | None = Field(default=None, gt=0, le=24)
    diet_pattern: str | None = Field(default=None, min_length=1, max_length=100)


class ProfileCreate(ProfileBase):
    pass


class ProfileUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    age: int | None = Field(default=None, gt=0, le=150)
    gender: str | None = Field(default=None, min_length=1, max_length=50)
    height_cm: float | None = Field(default=None, gt=0, le=300)
    weight_kg: float | None = Field(default=None, gt=0, le=1000)
    goal_target_weight_kg: float | None = Field(default=None, gt=0, le=1000)
    goal_timeline_weeks: int | None = Field(default=None, gt=0, le=520)
    health_conditions: str | None = Field(default=None, max_length=500)
    activity_level: str | None = Field(default=None, min_length=1, max_length=50)
    sleep_hours: float | None = Field(default=None, gt=0, le=24)
    diet_pattern: str | None = Field(default=None, min_length=1, max_length=100)


class GenderUpdate(BaseModel):
    gender: str = Field(min_length=1, max_length=50)


class ProfileResponse(ProfileBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

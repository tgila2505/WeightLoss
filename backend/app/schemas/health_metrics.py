from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HealthMetricBase(BaseModel):
    weight_kg: float = Field(gt=0, le=1000)
    bmi: float | None = Field(default=None, gt=0, le=200)
    steps: int | None = Field(default=None, ge=0, le=1000000)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    height_cm: float | None = Field(default=None, gt=0, le=300)


class HealthMetricCreate(HealthMetricBase):
    pass


class HealthMetricUpdate(BaseModel):
    weight_kg: float | None = Field(default=None, gt=0, le=1000)
    bmi: float | None = Field(default=None, gt=0, le=200)
    steps: int | None = Field(default=None, ge=0, le=1000000)
    sleep_hours: float | None = Field(default=None, ge=0, le=24)
    height_cm: float | None = Field(default=None, gt=0, le=300)


class HealthMetricProcessed(BaseModel):
    weight_unit: str
    height_unit: str | None
    sleep_unit: str | None
    derived_bmi: float | None
    weight_trend: str
    bmi_trend: str


class HealthMetricResponse(HealthMetricBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    recorded_at: datetime
    created_at: datetime
    updated_at: datetime
    processed: HealthMetricProcessed

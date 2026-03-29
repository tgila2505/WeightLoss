from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class LabRecordCreate(BaseModel):
    test_name: str = Field(min_length=1, max_length=255)
    value: float = Field(ge=0, le=1000000)
    unit: str | None = Field(default=None, min_length=1, max_length=50)
    reference_range: str | None = Field(default=None, min_length=1, max_length=100)
    recorded_date: date


class LabEvaluation(BaseModel):
    normalized_test_name: str | None
    status: str
    is_abnormal: bool
    rule_applied: bool


class LabProcessed(BaseModel):
    normalized_value: float
    normalized_unit: str | None
    trend: str


class LabRecordResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    test_name: str
    value: float
    unit: str | None
    reference_range: str | None
    recorded_date: date
    created_at: datetime
    updated_at: datetime
    processed: LabProcessed
    evaluation: LabEvaluation

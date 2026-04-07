import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    report_type: str
    period_key: str
    content: dict[str, Any]
    adjustments: dict | None
    adjustment_accepted_at: datetime | None
    status: str
    generated_at: datetime | None
    created_at: datetime


class AcceptAdjustmentRequest(BaseModel):
    report_id: uuid.UUID

from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field


class ReminderBase(BaseModel):
    reminder_type: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=255)
    scheduled_time: time
    cadence: str = Field(min_length=1, max_length=50, default="daily")
    is_active: bool = True


class ReminderCreate(ReminderBase):
    pass


class ReminderResponse(ReminderBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

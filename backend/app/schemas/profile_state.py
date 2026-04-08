# backend/app/schemas/profile_state.py
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ProfileStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    state: dict[str, Any]
    updated_at: datetime


class ProfileStateUpdate(BaseModel):
    state: dict[str, Any]

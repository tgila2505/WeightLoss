from typing import Any

from pydantic import BaseModel


class OnboardingStateUpdate(BaseModel):
    current_step: int
    form_data: dict[str, Any] = {}
    completed: bool = False


class OnboardingStateResponse(BaseModel):
    user_id: int
    current_step: int
    completed: bool
    form_data: dict[str, Any]
    updated_at: str

    model_config = {"from_attributes": True}

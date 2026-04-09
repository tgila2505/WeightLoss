from datetime import datetime

from pydantic import BaseModel


class SharedPlanCreate(BaseModel):
    plan_data: dict


class SharedPlanOut(BaseModel):
    slug: str
    plan_data: dict
    views: int
    created_at: datetime
    expires_at: datetime | None

    model_config = {"from_attributes": True}


class SharedPlanListItem(BaseModel):
    slug: str
    views: int
    created_at: datetime
    expires_at: datetime | None
    is_active: bool

    model_config = {"from_attributes": True}

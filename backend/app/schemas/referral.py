from datetime import datetime

from pydantic import BaseModel

from app.models.referral import RewardStatus, RewardType


class ReferralOut(BaseModel):
    code: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ReferralStatsOut(BaseModel):
    code: str | None
    clicks: int
    signups: int
    conversions: int
    rewards_earned: int
    premium_until: datetime | None


class TrackClickOut(BaseModel):
    tracked: bool


class RewardLogOut(BaseModel):
    reward_type: RewardType
    reward_value: int
    status: RewardStatus
    created_at: datetime

    model_config = {"from_attributes": True}

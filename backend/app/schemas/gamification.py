from datetime import date

from pydantic import BaseModel


class StreakDetail(BaseModel):
    current: int
    longest: int
    last_checkin_date: date | None
    freeze_available: bool
    freeze_resets_at: date | None


class NextMilestone(BaseModel):
    type: str
    days_remaining: int | None = None


class GamificationStatusResponse(BaseModel):
    streak: StreakDetail
    total_checkins: int
    badges: list[str]
    next_milestone: NextMilestone | None

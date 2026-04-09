from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    username: str         # masked: al***@***.com
    weight_lost_kg: float
    weeks_tracked: int


class LeaderboardOut(BaseModel):
    entries: list[LeaderboardEntry]
    total_opted_in: int

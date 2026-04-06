from typing import Any, Optional

from pydantic import BaseModel


class FeedbackPayload(BaseModel):
    session_id: str
    feedback_type: str  # "rating" | "text" | "mixed"
    rating: Optional[int] = None  # 1–5
    text: Optional[str] = None
    context: Optional[str] = None
    metadata: dict[str, Any] = {}


class BehaviorSignalPayload(BaseModel):
    session_id: str
    signal_type: str  # rage_click | drop_off | hesitation | repeated_action | abandonment
    context: Optional[str] = None
    properties: dict[str, Any] = {}

from typing import Any, Optional

from pydantic import BaseModel


class AnalyticsEventPayload(BaseModel):
    event: str
    userId: Optional[int] = None
    sessionId: str
    uxMode: str
    timestamp: str
    properties: dict[str, Any] = {}

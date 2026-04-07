import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class NotificationPreferencesResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    push_enabled: bool
    email_enabled: bool
    preferred_push_time: str
    user_timezone: str
    daily_reminder_enabled: bool
    streak_alerts_enabled: bool
    goal_nudges_enabled: bool
    marketing_emails: bool


class NotificationPreferencesUpdate(BaseModel):
    push_enabled: bool | None = None
    email_enabled: bool | None = None
    preferred_push_time: str | None = None
    user_timezone: str | None = None
    daily_reminder_enabled: bool | None = None
    streak_alerts_enabled: bool | None = None
    goal_nudges_enabled: bool | None = None
    marketing_emails: bool | None = None


class PushSubscribeRequest(BaseModel):
    subscription: dict[str, Any]  # Web Push API subscription object


class NotificationEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    type: str
    channel: str
    title: str
    body: str | None
    payload: dict | None
    status: str
    created_at: datetime


class NotificationInboxResponse(BaseModel):
    unread_count: int
    notifications: list[NotificationEventResponse]

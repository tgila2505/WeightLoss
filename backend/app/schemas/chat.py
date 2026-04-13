from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatMessageSchema(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    conversation_id: str
    agent: str
    messages: list[ChatMessageSchema]


class NewConversationResponse(BaseModel):
    conversation_id: str


class SendMessageRequest(BaseModel):
    agent: Literal["gp", "endo", "dietitian", "trainer", "panel"]
    message: str
    conversation_id: str

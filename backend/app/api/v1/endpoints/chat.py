from __future__ import annotations

import json
import os
import uuid
from typing import AsyncIterator

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db_session
from app.dependencies.auth import get_current_user
from app.dependencies.billing import SubscriptionAccess, require_capability
from app.models.chat import ChatMessage
from app.models.profile import Profile
from app.models.health_metrics import HealthMetrics
from app.models.lab import LabRecord
from app.models.user import User
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageSchema,
    NewConversationResponse,
    SendMessageRequest,
)

router = APIRouter(prefix="/chat")

_AI_SERVICES_URL = os.environ.get("AI_SERVICES_URL", "http://localhost:8001")

# Capability required: "ai_plans" (available on pro and pro_plus tiers)
_chat_gate = require_capability("ai_plans")

_VALID_AGENTS = frozenset({"gp", "endo", "dietitian", "trainer", "panel"})


def _get_or_create_conversation_id(
    session: Session, user_id: int, agent: str
) -> uuid.UUID:
    """Return the most recent conversation_id for this user+agent, or create a new one."""
    row = session.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id, ChatMessage.agent == agent)
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    ).first()
    return row.conversation_id if row else uuid.uuid4()


@router.get("/{agent}/history", response_model=ChatHistoryResponse)
def get_chat_history(
    agent: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(_chat_gate),
) -> ChatHistoryResponse:
    if agent not in _VALID_AGENTS:
        raise HTTPException(status_code=422, detail=f"Unknown agent: {agent!r}")
    conversation_id = _get_or_create_conversation_id(session, current_user.id, agent)
    messages = list(
        session.scalars(
            select(ChatMessage)
            .where(
                ChatMessage.user_id == current_user.id,
                ChatMessage.conversation_id == conversation_id,
            )
            .order_by(ChatMessage.created_at.asc())
            .limit(20)
        ).all()
    )
    return ChatHistoryResponse(
        conversation_id=str(conversation_id),
        agent=agent,
        messages=[ChatMessageSchema.model_validate(m) for m in messages],
    )


@router.post("/{agent}/new", response_model=NewConversationResponse)
def new_conversation(
    agent: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(_chat_gate),
) -> NewConversationResponse:
    if agent not in _VALID_AGENTS:
        raise HTTPException(status_code=422, detail=f"Unknown agent: {agent!r}")
    new_id = uuid.uuid4()
    return NewConversationResponse(conversation_id=str(new_id))


@router.post("/message")
async def send_chat_message(
    payload: SendMessageRequest,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(_chat_gate),
) -> StreamingResponse:
    conversation_id = uuid.UUID(payload.conversation_id)

    # Save user message immediately
    user_msg = ChatMessage(
        user_id=current_user.id,
        conversation_id=conversation_id,
        agent=payload.agent,
        role="user",
        content=payload.message,
    )
    session.add(user_msg)
    session.commit()

    # Fetch last 20 messages for history injection
    history_rows = list(
        session.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(20)
        ).all()
    )
    conversation_history = [
        {"role": m.role, "content": m.content} for m in reversed(history_rows)
    ]

    # Fetch user context from DB
    profile = session.scalars(
        select(Profile).where(Profile.user_id == current_user.id)
    ).first()
    metrics = list(
        session.scalars(
            select(HealthMetrics)
            .where(HealthMetrics.user_id == current_user.id)
            .order_by(HealthMetrics.recorded_at.desc())
            .limit(10)
        ).all()
    )
    labs = list(
        session.scalars(
            select(LabRecord)
            .where(LabRecord.user_id == current_user.id)
            .order_by(LabRecord.recorded_date.desc())
            .limit(20)
        ).all()
    )

    user_context: dict = {}
    if profile:
        user_context["user_profile"] = {
            "user_id": current_user.id,
            "name": profile.name,
            "age": profile.age,
            "gender": profile.gender,
            "height_cm": float(profile.height_cm) if profile.height_cm is not None else None,
            "weight_kg": float(profile.weight_kg) if profile.weight_kg is not None else None,
            "goal_target_weight_kg": float(profile.goal_target_weight_kg) if profile.goal_target_weight_kg is not None else None,
            "goal_timeline_weeks": profile.goal_timeline_weeks,
            "health_conditions": profile.health_conditions,
            "activity_level": profile.activity_level,
            "sleep_hours": float(profile.sleep_hours) if profile.sleep_hours is not None else None,
            "diet_pattern": profile.diet_pattern,
        }
    if metrics:
        user_context["health_metrics"] = [
            {
                "weight_kg": float(m.weight_kg) if m.weight_kg is not None else None,
                "bmi": float(m.bmi) if m.bmi is not None else None,
                "steps": m.steps,
                "sleep_hours": float(m.sleep_hours) if m.sleep_hours is not None else None,
                "height_cm": float(m.height_cm) if m.height_cm is not None else None,
                "recorded_at": m.recorded_at.isoformat(),
            }
            for m in metrics
        ]
    if labs:
        user_context["lab_records"] = [
            {
                "test_name": lab.test_name,
                "value": float(lab.value),
                "unit": lab.unit,
                "reference_range": lab.reference_range,
                "recorded_date": lab.recorded_date.isoformat(),
            }
            for lab in labs
        ]

    ai_payload = {
        "agent": payload.agent,
        "message": payload.message,
        "conversation_history": conversation_history,
        "user_context": user_context,
    }

    user_id = current_user.id
    agent = payload.agent
    collected: list[str] = []

    async def generate() -> AsyncIterator[bytes]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream(
                    "POST", f"{_AI_SERVICES_URL}/chat", json=ai_payload
                ) as response:
                    if response.status_code != 200:
                        error_msg = json.dumps({"error": "AI service returned an error"})
                        yield f"data: {error_msg}\n\n".encode()
                        yield b"data: [DONE]\n\n"
                        return
                    async for line in response.aiter_lines():
                        if line:
                            yield (line + "\n\n").encode()
                            if line.startswith("data: ") and line != "data: [DONE]":
                                try:
                                    token = json.loads(line[6:]).get("token", "")
                                    if token:
                                        collected.append(token)
                                except (json.JSONDecodeError, KeyError):
                                    pass
            except httpx.RequestError:
                error_msg = json.dumps({"error": "Unable to reach AI service"})
                yield f"data: {error_msg}\n\n".encode()
                yield b"data: [DONE]\n\n"
                return

        # Save assistant message after stream completes
        assistant_content = "".join(collected)
        if assistant_content:
            with SessionLocal() as db:
                db.add(
                    ChatMessage(
                        user_id=user_id,
                        conversation_id=conversation_id,
                        agent=agent,
                        role="assistant",
                        content=assistant_content,
                    )
                )
                db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream")

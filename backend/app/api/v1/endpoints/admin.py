from __future__ import annotations

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db_session
from app.dependencies.auth import get_admin_user
from app.models.user import User
from app.schemas.admin import AiKeysInternalResponse, AiKeysPublicResponse, AiKeysUpdate
from app.services.admin_service import admin_service

router = APIRouter()


# ── Admin-authenticated endpoints ──────────────────────────────────────────────

@router.get(
    "/admin/ai-keys",
    response_model=AiKeysPublicResponse,
    summary="Get AI key status (masked)",
)
def get_ai_keys(
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_db_session),
) -> AiKeysPublicResponse:
    return admin_service.get_ai_keys_public(session)


@router.patch(
    "/admin/ai-keys",
    response_model=AiKeysPublicResponse,
    summary="Update AI keys — writes to DB, env files, and hot-reloads ai-services",
)
def update_ai_keys(
    payload: AiKeysUpdate,
    current_user: User = Depends(get_admin_user),
    session: Session = Depends(get_db_session),
) -> AiKeysPublicResponse:
    return admin_service.update_ai_keys(session, current_user, payload)


# ── Service-to-service internal endpoint ──────────────────────────────────────

@router.get(
    "/internal/ai-keys",
    response_model=AiKeysInternalResponse,
    summary="Internal: return full AI keys for server-side Next.js use",
    include_in_schema=False,
)
def get_ai_keys_internal(
    x_internal_secret: str | None = Header(default=None),
    session: Session = Depends(get_db_session),
) -> AiKeysInternalResponse:
    settings = get_settings()
    if not x_internal_secret or x_internal_secret != settings.internal_service_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid internal service secret",
        )
    return admin_service.get_ai_keys_internal(session)

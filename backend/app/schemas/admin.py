from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AiKeysUpdate(BaseModel):
    groq_api_key: str
    mistral_api_key: str


class AiKeysPublicResponse(BaseModel):
    """Returned to the admin UI — keys are masked for security."""

    groq_key_set: bool
    groq_key_preview: str  # e.g. "gsk_1234..." or ""
    mistral_key_set: bool
    mistral_key_preview: str
    updated_at: datetime | None = None


class AiKeysInternalResponse(BaseModel):
    """Returned to internal services (Next.js API routes) via service-to-service call."""

    groq_api_key: str
    mistral_api_key: str

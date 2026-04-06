import logging

from fastapi import APIRouter

from app.schemas.analytics import AnalyticsEventPayload

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analytics/events", status_code=204)
async def record_analytics_event(payload: AnalyticsEventPayload) -> None:
    """
    Phase 1: log-only. Accepts analytics events from the frontend.
    Phase 2: persist to analytics_events table (see Task 13 in the implementation plan).
    """
    logger.info(
        "analytics_event event=%s user_id=%s session=%s ux_mode=%s ts=%s",
        payload.event,
        payload.userId,
        payload.sessionId,
        payload.uxMode,
        payload.timestamp,
    )

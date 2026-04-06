import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.analytics import AnalyticsEvent
from app.schemas.analytics import AnalyticsEventPayload

router = APIRouter()
logger = logging.getLogger(__name__)


@router.post("/analytics/events", status_code=204)
def record_analytics_event(
    payload: AnalyticsEventPayload,
    session: Session = Depends(get_db_session),
) -> None:
    """Accepts and persists analytics events from the frontend."""
    logger.info(
        "analytics_event event=%s user_id=%s session=%s ux_mode=%s",
        payload.event,
        payload.userId,
        payload.sessionId,
        payload.uxMode,
    )
    event = AnalyticsEvent(
        event=payload.event,
        user_id=payload.userId,
        session_id=payload.sessionId,
        ux_mode=payload.uxMode,
        event_timestamp=datetime.fromisoformat(
            payload.timestamp.replace("Z", "+00:00")
        ),
        properties=payload.properties,
    )
    session.add(event)
    session.commit()

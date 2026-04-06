import logging

from sqlalchemy.orm import Session

from app.models.feedback import BehaviorSignal, FeedbackEntry
from app.schemas.feedback import BehaviorSignalPayload, FeedbackPayload

logger = logging.getLogger(__name__)


class FeedbackService:
    def create_feedback(
        self,
        session: Session,
        payload: FeedbackPayload,
        user_id: int | None = None,
    ) -> FeedbackEntry:
        entry = FeedbackEntry(
            user_id=user_id,
            session_id=payload.session_id,
            feedback_type=payload.feedback_type,
            rating=payload.rating,
            text=payload.text,
            context=payload.context,
            metadata_=payload.metadata,
        )
        session.add(entry)
        session.commit()
        logger.info(
            "feedback_received user_id=%s type=%s rating=%s context=%s",
            user_id,
            payload.feedback_type,
            payload.rating,
            payload.context,
        )
        return entry

    def log_signal(
        self,
        session: Session,
        payload: BehaviorSignalPayload,
        user_id: int | None = None,
    ) -> None:
        signal = BehaviorSignal(
            user_id=user_id,
            session_id=payload.session_id,
            signal_type=payload.signal_type,
            context=payload.context,
            properties=payload.properties,
        )
        session.add(signal)
        session.commit()
        logger.info(
            "behavior_signal user_id=%s type=%s context=%s",
            user_id,
            payload.signal_type,
            payload.context,
        )

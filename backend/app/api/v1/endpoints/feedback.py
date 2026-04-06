import logging

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user_optional
from app.models.user import User
from app.schemas.feedback import BehaviorSignalPayload, FeedbackPayload
from app.services.feedback_service import FeedbackService

router = APIRouter(prefix="/feedback")
_service = FeedbackService()
logger = logging.getLogger(__name__)


@router.post("", status_code=204)
def submit_feedback(
    payload: FeedbackPayload,
    session: Session = Depends(get_db_session),
    current_user: User | None = Depends(get_current_user_optional),
) -> None:
    _service.create_feedback(
        session, payload, user_id=current_user.id if current_user else None
    )


@router.post("/signals", status_code=204)
def log_behavior_signal(
    payload: BehaviorSignalPayload,
    session: Session = Depends(get_db_session),
    current_user: User | None = Depends(get_current_user_optional),
) -> None:
    _service.log_signal(
        session, payload, user_id=current_user.id if current_user else None
    )

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.reminder import ReminderCreate, ReminderResponse
from app.services.reminder_service import ReminderService

router = APIRouter(prefix="/reminders")
reminder_service = ReminderService()


@router.post("", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    payload: ReminderCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ReminderResponse:
    reminder = reminder_service.create_reminder(session, current_user, payload)
    return ReminderResponse.model_validate(reminder)


@router.get("", response_model=list[ReminderResponse])
def list_reminders(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[ReminderResponse]:
    reminders = reminder_service.list_reminders(session, current_user)
    return [ReminderResponse.model_validate(reminder) for reminder in reminders]

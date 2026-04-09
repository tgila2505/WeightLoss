from fastapi import APIRouter, BackgroundTasks, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.habits import CheckInCreate, CheckInResponse, CheckInTodayResponse, MealSuggestionResponse
from app.services.habit_service import habit_service
from app.services.meal_service import meal_service

router = APIRouter(prefix="/habits")


@router.post("/checkin", response_model=CheckInResponse, status_code=status.HTTP_200_OK)
def submit_checkin(
    payload: CheckInCreate,
    background_tasks: BackgroundTasks,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CheckInResponse:
    return habit_service.submit_checkin(session, current_user, payload, background_tasks)


@router.get("/checkin/today", response_model=CheckInTodayResponse)
def get_today_checkin(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> CheckInTodayResponse:
    return habit_service.get_today_checkin(session, current_user)


@router.get("/feedback/status")
def get_feedback_status(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    return habit_service.get_feedback_status(session, current_user)


@router.post("/meal-suggestion", response_model=MealSuggestionResponse)
def get_meal_suggestion(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MealSuggestionResponse:
    return meal_service.get_suggestion(session, current_user)

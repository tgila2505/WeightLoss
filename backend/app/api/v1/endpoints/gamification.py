from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.gamification import GamificationStatusResponse
from app.services.gamification_service import gamification_service

router = APIRouter(prefix="/gamification")


@router.get("/status", response_model=GamificationStatusResponse)
def get_gamification_status(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> GamificationStatusResponse:
    return gamification_service.get_status(session, current_user)

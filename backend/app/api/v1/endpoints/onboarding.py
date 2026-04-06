from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.onboarding import OnboardingStateResponse, OnboardingStateUpdate
from app.services.onboarding_service import OnboardingService

router = APIRouter(prefix="/onboarding")
_service = OnboardingService()


@router.get("/state", response_model=OnboardingStateResponse | None)
def get_onboarding_state(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> OnboardingStateResponse | None:
    state = _service.get_state(session, current_user)
    if state is None:
        return None
    return OnboardingStateResponse.model_validate(state)


@router.put("/state", response_model=OnboardingStateResponse)
def upsert_onboarding_state(
    payload: OnboardingStateUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> OnboardingStateResponse:
    state = _service.upsert_state(session, current_user, payload)
    return OnboardingStateResponse.model_validate(state)

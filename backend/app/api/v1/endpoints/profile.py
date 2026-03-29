from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.profile import ProfileCreate, ProfileResponse, ProfileUpdate
from app.services.profile_service import ProfileService

router = APIRouter(prefix="/profile")
profile_service = ProfileService()


@router.post("", response_model=ProfileResponse, status_code=status.HTTP_201_CREATED)
def create_profile(
    payload: ProfileCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    profile = profile_service.create_profile(session, current_user, payload)
    return ProfileResponse.model_validate(profile)


@router.get("", response_model=ProfileResponse)
def get_profile(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    profile = profile_service.get_profile(session, current_user)
    return ProfileResponse.model_validate(profile)


@router.put("", response_model=ProfileResponse)
def update_profile(
    payload: ProfileUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileResponse:
    profile = profile_service.update_profile(session, current_user, payload)
    return ProfileResponse.model_validate(profile)


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def delete_profile(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    profile_service.delete_profile(session, current_user)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

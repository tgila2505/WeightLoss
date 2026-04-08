# backend/app/api/v1/endpoints/profile_state.py
import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.profile_state import UserMindMapState, UserWizardState
from app.models.user import User
from app.schemas.profile_state import ProfileStateResponse, ProfileStateUpdate

router = APIRouter()


# ── Mind Map ──────────────────────────────────────────────────────────────────

@router.get("/mindmap/state", response_model=ProfileStateResponse)
def get_mindmap_state(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserMindMapState).filter_by(user_id=current_user.id).first()
    if row is None:
        return ProfileStateResponse(state={}, updated_at=datetime.datetime.now(datetime.timezone.utc))
    return ProfileStateResponse.model_validate(row)


@router.put("/mindmap/state", response_model=ProfileStateResponse)
def put_mindmap_state(
    payload: ProfileStateUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserMindMapState).filter_by(user_id=current_user.id).first()
    if row is None:
        row = UserMindMapState(user_id=current_user.id, state=payload.state)
        session.add(row)
    else:
        row.state = payload.state
    session.commit()
    session.refresh(row)
    return ProfileStateResponse.model_validate(row)


# ── Wizard ────────────────────────────────────────────────────────────────────

@router.get("/wizard/state", response_model=ProfileStateResponse)
def get_wizard_state(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserWizardState).filter_by(user_id=current_user.id).first()
    if row is None:
        return ProfileStateResponse(state={}, updated_at=datetime.datetime.now(datetime.timezone.utc))
    return ProfileStateResponse.model_validate(row)


@router.put("/wizard/state", response_model=ProfileStateResponse)
def put_wizard_state(
    payload: ProfileStateUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserWizardState).filter_by(user_id=current_user.id).first()
    if row is None:
        row = UserWizardState(user_id=current_user.id, state=payload.state)
        session.add(row)
    else:
        row.state = payload.state
    session.commit()
    session.refresh(row)
    return ProfileStateResponse.model_validate(row)

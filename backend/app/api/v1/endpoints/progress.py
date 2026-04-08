from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.progress import ProgressEntryCreate, ProgressEntryResponse, ProgressSummaryResponse
from app.services.progress_service import progress_service

router = APIRouter(prefix="/progress")


@router.get("/summary", response_model=ProgressSummaryResponse)
def get_progress_summary(
    days: int = Query(default=30, ge=7, le=365),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProgressSummaryResponse:
    return progress_service.get_summary(session, current_user, days=days)


@router.get("/entries", response_model=list[ProgressEntryResponse])
def list_progress_entries(
    from_date: date | None = Query(default=None),
    to_date: date | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[ProgressEntryResponse]:
    return progress_service.get_entries(session, current_user, from_date, to_date, limit, offset)


@router.post("/entries", response_model=ProgressEntryResponse, status_code=status.HTTP_201_CREATED)
def create_progress_entry(
    payload: ProgressEntryCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProgressEntryResponse:
    return progress_service.create_entry(session, current_user, payload)

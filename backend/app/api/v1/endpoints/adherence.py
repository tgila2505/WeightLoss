from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.adherence import (
    AdherenceRecordCreate,
    AdherenceRecordResponse,
    AdherenceSummaryResponse,
)
from app.services.adherence_service import AdherenceService

router = APIRouter(prefix="/adherence")
adherence_service = AdherenceService()


@router.post("", response_model=AdherenceRecordResponse, status_code=status.HTTP_201_CREATED)
def create_adherence_record(
    payload: AdherenceRecordCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AdherenceRecordResponse:
    record = adherence_service.create_record(session, current_user, payload)
    return AdherenceRecordResponse.model_validate(record)


@router.get("", response_model=list[AdherenceRecordResponse])
def list_adherence_records(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[AdherenceRecordResponse]:
    records = adherence_service.list_records(
        session,
        current_user,
        start_date=start_date,
        end_date=end_date,
    )
    return [AdherenceRecordResponse.model_validate(record) for record in records]


@router.get("/summary", response_model=AdherenceSummaryResponse)
def get_adherence_summary(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AdherenceSummaryResponse:
    return adherence_service.build_summary(session, current_user)

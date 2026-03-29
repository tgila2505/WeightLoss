from datetime import date

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.lab import LabRecordCreate, LabRecordResponse
from app.services.lab_service import LabService

router = APIRouter(prefix="/labs")
lab_service = LabService()


@router.post("", response_model=LabRecordResponse, status_code=status.HTTP_201_CREATED)
def create_lab_record(
    payload: LabRecordCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> LabRecordResponse:
    record = lab_service.create_lab_record(session, current_user, payload)
    return lab_service.build_response(session, current_user, record)


@router.get("", response_model=list[LabRecordResponse])
def list_lab_records(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[LabRecordResponse]:
    records = lab_service.list_lab_records(
        session,
        current_user,
        start_date=start_date,
        end_date=end_date,
    )
    return [lab_service.build_response(session, current_user, record) for record in records]


@router.get("/{record_id}", response_model=LabRecordResponse)
def get_lab_record(
    record_id: int,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> LabRecordResponse:
    record = lab_service.get_lab_record(session, current_user, record_id)
    return lab_service.build_response(session, current_user, record)

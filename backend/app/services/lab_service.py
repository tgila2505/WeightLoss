from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.lab import LabRecord
from app.models.user import User
from app.schemas.lab import LabRecordCreate, LabRecordResponse
from app.services.data_processing_service import DataProcessingService
from app.services.lab_rule_engine import LabRuleEngine


class LabService:
    def __init__(self) -> None:
        self._data_processing_service = DataProcessingService()
        self._rule_engine = LabRuleEngine()

    def create_lab_record(
        self,
        session: Session,
        user: User,
        payload: LabRecordCreate,
    ) -> LabRecord:
        normalized = self._data_processing_service.normalize_lab_record(
            test_name=payload.test_name,
            value=payload.value,
            unit=payload.unit,
            reference_range=payload.reference_range,
        )
        record = LabRecord(
            user_id=user.id,
            test_name=normalized.test_name,
            value=normalized.value,
            unit=normalized.unit,
            reference_range=normalized.reference_range,
            recorded_date=payload.recorded_date,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record

    def list_lab_records(
        self,
        session: Session,
        user: User,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[LabRecord]:
        statement = select(LabRecord).where(LabRecord.user_id == user.id)
        if start_date is not None:
            statement = statement.where(LabRecord.recorded_date >= start_date)
        if end_date is not None:
            statement = statement.where(LabRecord.recorded_date <= end_date)

        statement = statement.order_by(LabRecord.recorded_date.desc(), LabRecord.id.desc())
        return list(session.scalars(statement).all())

    def get_lab_record(
        self,
        session: Session,
        user: User,
        record_id: int,
    ) -> LabRecord:
        record = session.scalar(
            select(LabRecord).where(
                LabRecord.id == record_id,
                LabRecord.user_id == user.id,
            )
        )
        if record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Lab record not found",
            )
        return record

    def build_response(
        self,
        session: Session,
        user: User,
        record: LabRecord,
    ) -> LabRecordResponse:
        previous_record = self.get_previous_lab_record(session, user, record)
        payload = {
            "id": record.id,
            "user_id": record.user_id,
            "test_name": record.test_name,
            "value": float(record.value),
            "unit": record.unit,
            "reference_range": record.reference_range,
            "recorded_date": record.recorded_date,
            "created_at": record.created_at,
            "updated_at": record.updated_at,
            "processed": self._data_processing_service.build_lab_processed(
                record,
                previous_record,
            ),
            "evaluation": self._rule_engine.evaluate(record),
        }
        return LabRecordResponse.model_validate(payload)

    def get_previous_lab_record(
        self,
        session: Session,
        user: User,
        record: LabRecord,
    ) -> LabRecord | None:
        statement = (
            select(LabRecord)
            .where(
                LabRecord.user_id == user.id,
                LabRecord.test_name == record.test_name,
                LabRecord.recorded_date < record.recorded_date,
            )
            .order_by(LabRecord.recorded_date.desc(), LabRecord.id.desc())
            .limit(1)
        )
        return session.scalar(statement)

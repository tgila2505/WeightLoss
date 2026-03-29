from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.adherence import AdherenceRecord
from app.models.user import User
from app.schemas.adherence import AdherenceRecordCreate
from app.services.adaptive_service import AdaptiveService


class AdherenceService:
    def __init__(self) -> None:
        self._adaptive_service = AdaptiveService()

    def create_record(
        self,
        session: Session,
        user: User,
        payload: AdherenceRecordCreate,
    ) -> AdherenceRecord:
        record = AdherenceRecord(user_id=user.id, **payload.model_dump())
        session.add(record)
        session.commit()
        session.refresh(record)

        summary = self.build_summary(session, user)
        self._adaptive_service.update_user(session, user, summary)
        return record

    def list_records(
        self,
        session: Session,
        user: User,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[AdherenceRecord]:
        statement = select(AdherenceRecord).where(AdherenceRecord.user_id == user.id)
        if start_date is not None:
            statement = statement.where(AdherenceRecord.adherence_date >= start_date)
        if end_date is not None:
            statement = statement.where(AdherenceRecord.adherence_date <= end_date)

        statement = statement.order_by(
            AdherenceRecord.adherence_date.desc(),
            AdherenceRecord.id.desc(),
        )
        return list(session.scalars(statement).all())

    def build_summary(self, session: Session, user: User):
        records = self.list_records(session, user)
        return self._adaptive_service.build_summary(records)

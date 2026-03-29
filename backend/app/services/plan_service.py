import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.plan import Plan
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanPayload, PlanResponse


class PlanService:
    def create_plan(self, session: Session, user: User, payload: PlanCreate) -> PlanResponse:
        record = Plan(
            user_id=user.id,
            title=payload.title,
            status=payload.status,
            summary=json.dumps(payload.plan.model_dump()),
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return self._to_response(record)

    def get_latest_plan(self, session: Session, user: User) -> PlanResponse | None:
        statement = (
            select(Plan)
            .where(Plan.user_id == user.id)
            .order_by(Plan.created_at.desc(), Plan.id.desc())
        )
        record = session.scalar(statement)
        if record is None:
            return None
        return self._to_response(record)

    def _to_response(self, record: Plan) -> PlanResponse:
        payload = json.loads(record.summary) if record.summary else {}
        return PlanResponse(
            id=record.id,
            user_id=record.user_id,
            title=record.title,
            status=record.status,
            plan=PlanPayload.model_validate(payload),
            created_at=record.created_at,
            updated_at=record.updated_at,
        )

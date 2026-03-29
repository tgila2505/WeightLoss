from datetime import date

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.health_metrics import HealthMetrics
from app.models.user import User
from app.schemas.health_metrics import (
    HealthMetricCreate,
    HealthMetricResponse,
    HealthMetricUpdate,
)
from app.services.data_processing_service import DataProcessingService


class HealthMetricsService:
    def __init__(self) -> None:
        self._data_processing_service = DataProcessingService()

    def create_metric(
        self,
        session: Session,
        user: User,
        payload: HealthMetricCreate,
    ) -> HealthMetrics:
        metric_data = payload.model_dump()
        metric_data["bmi"] = self._data_processing_service.compute_bmi(
            metric_data["weight_kg"],
            metric_data.get("height_cm"),
        )
        metric = HealthMetrics(user_id=user.id, **metric_data)
        session.add(metric)
        session.commit()
        session.refresh(metric)
        return metric

    def list_metrics(
        self,
        session: Session,
        user: User,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> list[HealthMetrics]:
        statement = select(HealthMetrics).where(HealthMetrics.user_id == user.id)
        if start_date is not None:
            statement = statement.where(func.date(HealthMetrics.recorded_at) >= start_date)
        if end_date is not None:
            statement = statement.where(func.date(HealthMetrics.recorded_at) <= end_date)

        statement = statement.order_by(HealthMetrics.recorded_at.desc(), HealthMetrics.id.desc())
        return list(session.scalars(statement).all())

    def get_metric(
        self,
        session: Session,
        user: User,
        metric_id: int,
    ) -> HealthMetrics:
        metric = session.scalar(
            select(HealthMetrics).where(
                HealthMetrics.id == metric_id,
                HealthMetrics.user_id == user.id,
            )
        )
        if metric is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Health metric not found",
            )
        return metric

    def update_metric(
        self,
        session: Session,
        user: User,
        metric_id: int,
        payload: HealthMetricUpdate,
    ) -> HealthMetrics:
        metric = self.get_metric(session, user, metric_id)
        for field_name, value in payload.model_dump(exclude_unset=True).items():
            setattr(metric, field_name, value)

        metric.bmi = self._data_processing_service.compute_bmi(
            metric.weight_kg,
            metric.height_cm,
        )

        session.add(metric)
        session.commit()
        session.refresh(metric)
        return metric

    def delete_metric(
        self,
        session: Session,
        user: User,
        metric_id: int,
    ) -> None:
        metric = self.get_metric(session, user, metric_id)
        session.delete(metric)
        session.commit()

    def build_response(
        self,
        session: Session,
        user: User,
        metric: HealthMetrics,
    ) -> HealthMetricResponse:
        previous_metric = self.get_previous_metric(session, user, metric)
        payload = {
            "id": metric.id,
            "user_id": metric.user_id,
            "weight_kg": float(metric.weight_kg),
            "bmi": float(metric.bmi) if metric.bmi is not None else None,
            "steps": metric.steps,
            "sleep_hours": float(metric.sleep_hours) if metric.sleep_hours is not None else None,
            "height_cm": float(metric.height_cm) if metric.height_cm is not None else None,
            "recorded_at": metric.recorded_at,
            "created_at": metric.created_at,
            "updated_at": metric.updated_at,
            "processed": self._data_processing_service.build_health_metric_processed(
                metric,
                previous_metric,
            ),
        }
        return HealthMetricResponse.model_validate(payload)

    def get_previous_metric(
        self,
        session: Session,
        user: User,
        metric: HealthMetrics,
    ) -> HealthMetrics | None:
        statement = (
            select(HealthMetrics)
            .where(
                HealthMetrics.user_id == user.id,
                HealthMetrics.recorded_at < metric.recorded_at,
            )
            .order_by(HealthMetrics.recorded_at.desc(), HealthMetrics.id.desc())
            .limit(1)
        )
        return session.scalar(statement)

from datetime import date

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.health_metrics import (
    HealthMetricCreate,
    HealthMetricResponse,
    HealthMetricUpdate,
)
from app.services.health_metrics_service import HealthMetricsService

router = APIRouter(prefix="/health-metrics")
health_metrics_service = HealthMetricsService()


@router.post("", response_model=HealthMetricResponse, status_code=status.HTTP_201_CREATED)
def create_metric(
    payload: HealthMetricCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> HealthMetricResponse:
    metric = health_metrics_service.create_metric(session, current_user, payload)
    return health_metrics_service.build_response(session, current_user, metric)


@router.get("", response_model=list[HealthMetricResponse])
def list_metrics(
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> list[HealthMetricResponse]:
    metrics = health_metrics_service.list_metrics(
        session,
        current_user,
        start_date=start_date,
        end_date=end_date,
    )
    return [
        health_metrics_service.build_response(session, current_user, metric)
        for metric in metrics
    ]


@router.get("/{metric_id}", response_model=HealthMetricResponse)
def get_metric(
    metric_id: int,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> HealthMetricResponse:
    metric = health_metrics_service.get_metric(session, current_user, metric_id)
    return health_metrics_service.build_response(session, current_user, metric)


@router.put("/{metric_id}", response_model=HealthMetricResponse)
def update_metric(
    metric_id: int,
    payload: HealthMetricUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> HealthMetricResponse:
    metric = health_metrics_service.update_metric(
        session=session,
        user=current_user,
        metric_id=metric_id,
        payload=payload,
    )
    return health_metrics_service.build_response(session, current_user, metric)


@router.delete("/{metric_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_metric(
    metric_id: int,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> Response:
    health_metrics_service.delete_metric(session, current_user, metric_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)

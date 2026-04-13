import os

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.reports import AcceptAdjustmentRequest, ReportResponse
from app.services.report_service import report_service

router = APIRouter(prefix="/reports")

CRON_SECRET = os.getenv("CRON_SECRET", "")


@router.get("/weekly", response_model=ReportResponse | None)
def get_latest_weekly_report(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ReportResponse | None:
    return report_service.get_weekly_report(session, current_user)


@router.get("/weekly/{period_key}", response_model=ReportResponse | None)
def get_weekly_report_by_period(
    period_key: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ReportResponse | None:
    return report_service.get_weekly_report(session, current_user, period_key)


@router.post("/accept-adjustment", status_code=status.HTTP_200_OK)
def accept_adjustment(
    payload: AcceptAdjustmentRequest,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    ok = report_service.accept_adjustment(session, current_user, payload.report_id)
    if not ok:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="ADJUSTMENT_ALREADY_PROCESSED",
        )
    return {"accepted": True}


@router.post("/generate", status_code=status.HTTP_202_ACCEPTED)
def trigger_report_generation(
    authorization: str | None = Header(default=None),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> dict:
    """Cron-triggered endpoint. Requires CRON_SECRET header."""
    if CRON_SECRET and authorization != f"Bearer {CRON_SECRET}":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
    report_service.generate_weekly_report(session, current_user)
    return {"status": "queued"}


@router.get("/behavioral", response_model=ReportResponse | None)
def get_behavioral_report(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ReportResponse | None:
    return report_service.get_behavioral_report(session, current_user)

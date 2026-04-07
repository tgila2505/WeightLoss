from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanResponse
from app.services.funnel_service import FunnelService
from app.services.plan_service import PlanService

router = APIRouter(prefix="/plans")
plan_service = PlanService()
_funnel_service = FunnelService()


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PlanResponse:
    return plan_service.create_plan(session, current_user, payload)


@router.get("/today", response_model=PlanResponse)
def get_today_plan(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PlanResponse:
    access = _funnel_service.get_subscription_access(session, current_user.id)
    has_access = (
        access["tier"] == "pro"
        and access.get("status") in ("active", "trialing")
    )
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Pro subscription required to access daily plans",
        )

    plan = plan_service.get_latest_plan(session, current_user)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plan found.")
    return plan

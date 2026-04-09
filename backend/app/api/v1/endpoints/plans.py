from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.dependencies.billing import SubscriptionAccess, require_capability
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanResponse
from app.services.plan_service import PlanService

router = APIRouter(prefix="/plans")
plan_service = PlanService()


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(require_capability("ai_plans")),
) -> PlanResponse:
    return plan_service.create_plan(session, current_user, payload)


@router.get("/today", response_model=PlanResponse)
def get_today_plan(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(require_capability("meal_plan_full")),
) -> PlanResponse:
    plan = plan_service.get_latest_plan(session, current_user)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plan found.")
    return plan

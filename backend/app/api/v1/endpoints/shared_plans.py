from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.shared_plan import SharedPlanCreate, SharedPlanListItem, SharedPlanOut
from app.services.shared_plan_service import (
    create_shared_plan,
    deactivate_plan,
    get_shared_plan_by_slug,
    increment_view_count,
    list_user_plans,
)

router = APIRouter(prefix="/shared-plans")


@router.post("", response_model=SharedPlanOut, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: SharedPlanCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SharedPlanOut:
    """Create a shareable plan link."""
    plan = create_shared_plan(session, current_user.id, payload.plan_data)
    return SharedPlanOut.model_validate(plan)


@router.get("/me", response_model=list[SharedPlanListItem])
def list_my_plans(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[SharedPlanListItem]:
    """List all shared plans for the current user."""
    plans = list_user_plans(session, current_user.id)
    return [SharedPlanListItem.model_validate(p) for p in plans]


@router.get("/{slug}", response_model=SharedPlanOut)
def get_plan(
    slug: str,
    session: Session = Depends(get_db_session),
) -> SharedPlanOut:
    """Get a shared plan by slug (public). Increments view count."""
    plan = get_shared_plan_by_slug(session, slug)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    increment_view_count(session, plan)
    return SharedPlanOut.model_validate(plan)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete_plan(
    slug: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> None:
    """Deactivate a shared plan (owner only)."""
    plan = get_shared_plan_by_slug(session, slug)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found")
    if plan.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not your plan")
    deactivate_plan(session, plan)

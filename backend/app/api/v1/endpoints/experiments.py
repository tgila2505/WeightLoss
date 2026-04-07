from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.experiment import AssignmentResponse
from app.services.experiment_service import EXPERIMENTS, get_or_assign_variant

router = APIRouter(prefix="/experiments")


@router.get("/{experiment_key}/assignment", response_model=AssignmentResponse)
def get_assignment(
    experiment_key: str = Path(..., description="Experiment key, e.g. 'pricing-variant'"),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AssignmentResponse:
    """Return the authenticated user's deterministic variant for an experiment.

    Creates and persists a new assignment on the first call; returns the
    same stored variant on all subsequent calls.
    """
    if experiment_key not in EXPERIMENTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown experiment: {experiment_key!r}",
        )
    variant = get_or_assign_variant(session, current_user.id, experiment_key)
    return AssignmentResponse(experiment_key=experiment_key, variant=variant)

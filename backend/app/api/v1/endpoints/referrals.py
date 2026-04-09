from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.referral import ReferralOut, ReferralStatsOut, TrackClickOut
from app.services.referral_service import (
    get_or_create_referral,
    get_referral_by_code,
    get_referral_stats,
    track_referral_click,
)

router = APIRouter(prefix="/referrals")


@router.get("/me", response_model=ReferralOut)
def get_my_referral(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> ReferralOut:
    """Get or create the current user's referral code."""
    referral = get_or_create_referral(session, current_user.id)
    return ReferralOut.model_validate(referral)


@router.get("/me/stats", response_model=ReferralStatsOut)
def get_my_referral_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> ReferralStatsOut:
    """Get referral stats for the current user."""
    stats = get_referral_stats(session, current_user.id)
    return ReferralStatsOut(**stats)


@router.post("/click/{code}", response_model=TrackClickOut)
def track_click(
    code: str,
    request: Request,
    session: Session = Depends(get_db_session),
) -> TrackClickOut:
    """Record a click on a referral link. Deduplicated by IP within 1 hour."""
    referral = get_referral_by_code(session, code)
    if referral is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral code not found")

    client_ip = request.client.host if request.client else "unknown"
    track_referral_click(session, referral, client_ip)
    return TrackClickOut(tracked=True)

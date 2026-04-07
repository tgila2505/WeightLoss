from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.referral import Referral, ReferralEvent, RewardLog, RewardStatus, RewardType
from app.models.user import User

_REFERRED_PREMIUM_DAYS = 7
_REFERRER_PREMIUM_DAYS = 7
_MAX_MONTHLY_REWARDS = 20


def _extend_premium(user: User, days: int) -> None:
    now = datetime.now(UTC)
    base = user.premium_until
    if base is None or base.replace(tzinfo=UTC) < now:
        base = now
    else:
        base = base.replace(tzinfo=UTC)
    user.premium_until = (base + timedelta(days=days)).replace(tzinfo=None)


def apply_signup_reward(
    session: Session, referred_user_id: int, referral_event_id: int | None
) -> RewardLog:
    """Grant premium days to the newly referred user."""
    user = session.get(User, referred_user_id)
    if user is None:
        raise ValueError(f"User {referred_user_id} not found")

    _extend_premium(user, _REFERRED_PREMIUM_DAYS)

    log = RewardLog(
        user_id=referred_user_id,
        referral_event_id=referral_event_id,
        reward_type=RewardType.PREMIUM_DAYS,
        reward_value=_REFERRED_PREMIUM_DAYS,
        status=RewardStatus.APPLIED,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log


def apply_conversion_reward(
    session: Session, referral: Referral, referral_event: ReferralEvent
) -> RewardLog | None:
    """Grant premium days to the referrer when a referred user converts.

    Idempotent — returns None (silently) if already rewarded for this event.
    Capped at _MAX_MONTHLY_REWARDS rewards per calendar month.
    """
    # Idempotency: one reward per referral event
    existing = session.scalar(
        select(RewardLog).where(RewardLog.referral_event_id == referral_event.id)
    )
    if existing:
        return existing

    # Monthly cap check
    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_count = session.scalar(
        select(func.count())
        .select_from(RewardLog)
        .where(
            RewardLog.user_id == referral.referrer_user_id,
            RewardLog.created_at >= month_start,
            RewardLog.status == RewardStatus.APPLIED,
        )
    ) or 0

    if monthly_count >= _MAX_MONTHLY_REWARDS:
        return None

    referrer = session.get(User, referral.referrer_user_id)
    if referrer is None:
        return None

    _extend_premium(referrer, _REFERRER_PREMIUM_DAYS)

    log = RewardLog(
        user_id=referral.referrer_user_id,
        referral_event_id=referral_event.id,
        reward_type=RewardType.PREMIUM_DAYS,
        reward_value=_REFERRER_PREMIUM_DAYS,
        status=RewardStatus.APPLIED,
    )
    session.add(log)
    session.commit()
    session.refresh(log)
    return log

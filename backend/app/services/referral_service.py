import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.referral import Referral, ReferralEvent, ReferralEventType

_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no confusable chars (0/O, 1/I/L)


def _generate_code() -> str:
    return "".join(secrets.choice(_CODE_CHARS) for _ in range(8))


def get_or_create_referral(session: Session, user_id: int) -> Referral:
    """Return the user's active referral code, creating one if it doesn't exist."""
    existing = session.scalar(
        select(Referral).where(
            Referral.referrer_user_id == user_id,
            Referral.is_active.is_(True),
        )
    )
    if existing:
        return existing

    for _ in range(10):
        code = _generate_code()
        if not session.scalar(select(Referral).where(Referral.code == code)):
            break

    referral = Referral(referrer_user_id=user_id, code=code)
    session.add(referral)
    session.commit()
    session.refresh(referral)
    return referral


def get_referral_by_code(session: Session, code: str) -> Referral | None:
    return session.scalar(
        select(Referral).where(
            Referral.code == code.upper(),
            Referral.is_active.is_(True),
        )
    )


def track_referral_click(session: Session, referral: Referral, ip: str) -> ReferralEvent:
    """Record a click; deduplicate the same IP within 1 hour."""
    ip_hash = sha256(ip.encode()).hexdigest()
    cutoff = datetime.now(UTC) - timedelta(hours=1)

    existing = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referral_id == referral.id,
            ReferralEvent.event_type == ReferralEventType.CLICK,
            ReferralEvent.ip_hash == ip_hash,
            ReferralEvent.created_at >= cutoff,
        )
    )
    if existing:
        return existing

    event = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.CLICK,
        ip_hash=ip_hash,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def assign_referral_to_user(
    session: Session, referral: Referral, referred_user_id: int
) -> ReferralEvent | None:
    """Record a signup via referral. Returns None for self-referral or duplicate."""
    if referral.referrer_user_id == referred_user_id:
        return None

    existing = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referral_id == referral.id,
            ReferralEvent.referred_user_id == referred_user_id,
            ReferralEvent.event_type == ReferralEventType.SIGNUP,
        )
    )
    if existing:
        return existing

    event = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.SIGNUP,
        referred_user_id=referred_user_id,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def record_paid_conversion(
    session: Session, referral: Referral, referred_user_id: int
) -> ReferralEvent | None:
    """Record a paid conversion. Idempotent."""
    existing = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referral_id == referral.id,
            ReferralEvent.referred_user_id == referred_user_id,
            ReferralEvent.event_type == ReferralEventType.PAID_CONVERSION,
        )
    )
    if existing:
        return existing

    event = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.PAID_CONVERSION,
        referred_user_id=referred_user_id,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def get_referral_by_referred_user(session: Session, user_id: int) -> Referral | None:
    """Return the referral that brought this user in (via their signup event)."""
    event = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referred_user_id == user_id,
            ReferralEvent.event_type == ReferralEventType.SIGNUP,
        )
    )
    if not event:
        return None
    return session.get(Referral, event.referral_id)


def get_referral_stats(session: Session, user_id: int) -> dict:
    from app.models.referral import RewardLog
    from app.models.user import User

    referral = session.scalar(
        select(Referral).where(
            Referral.referrer_user_id == user_id,
            Referral.is_active.is_(True),
        )
    )
    user = session.get(User, user_id)
    premium_until = user.premium_until if user else None

    if not referral:
        return {
            "code": None,
            "clicks": 0,
            "signups": 0,
            "conversions": 0,
            "rewards_earned": 0,
            "premium_until": premium_until,
        }

    def _count(event_type: ReferralEventType) -> int:
        return session.scalar(
            select(func.count()).where(
                ReferralEvent.referral_id == referral.id,
                ReferralEvent.event_type == event_type,
            )
        ) or 0

    rewards_earned = session.scalar(
        select(func.count()).select_from(RewardLog).where(
            RewardLog.user_id == user_id
        )
    ) or 0

    return {
        "code": referral.code,
        "clicks": _count(ReferralEventType.CLICK),
        "signups": _count(ReferralEventType.SIGNUP),
        "conversions": _count(ReferralEventType.PAID_CONVERSION),
        "rewards_earned": rewards_earned,
        "premium_until": premium_until,
    }

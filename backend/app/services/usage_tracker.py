from datetime import date

from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from app.models.billing import UsageTracking

# Hard caps per tier per feature. None = unlimited
USAGE_LIMITS: dict[str, dict[str, dict[str, int | None]]] = {
    "free": {
        "ai_plan_regeneration": {"soft": 1, "hard": 1},
        "coaching_insight": {"soft": None, "hard": 0},
        "weekly_ai_report": {"soft": None, "hard": 0},
        "goal_specific_plan": {"soft": None, "hard": 0},
    },
    "pro": {
        "ai_plan_regeneration": {"soft": 5, "hard": 10},
        "coaching_insight": {"soft": 5, "hard": 10},
        "weekly_ai_report": {"soft": None, "hard": 0},
        "goal_specific_plan": {"soft": None, "hard": 0},
    },
    "pro_plus": {
        "ai_plan_regeneration": {"soft": None, "hard": None},
        "coaching_insight": {"soft": None, "hard": None},
        "weekly_ai_report": {"soft": None, "hard": None},
        "goal_specific_plan": {"soft": None, "hard": None},
    },
}


def _week_key() -> str:
    today = date.today()
    return today.strftime("%Y-W%W")


def _day_key() -> str:
    return date.today().isoformat()


def get_period_key(feature: str) -> str:
    """Week-based for ai_plan_regeneration/weekly_ai_report, day-based for coaching_insight."""
    if feature in ("coaching_insight",):
        return _day_key()
    return _week_key()


def increment_usage(session: Session, user_id: int, feature: str) -> int:
    """Upsert usage count. Returns new count."""
    period_key = get_period_key(feature)
    stmt = (
        insert(UsageTracking)
        .values(user_id=user_id, feature=feature, period_key=period_key, count=1)
        .on_conflict_do_update(
            constraint="uq_usage_tracking",
            set_={"count": UsageTracking.count + 1},
        )
        .returning(UsageTracking.count)
    )
    result = session.execute(stmt)
    session.commit()
    return result.scalar_one()


def get_usage(session: Session, user_id: int, feature: str) -> int:
    """Get current period usage count."""
    from sqlalchemy import select
    period_key = get_period_key(feature)
    row = session.scalar(
        select(UsageTracking).where(
            UsageTracking.user_id == user_id,
            UsageTracking.feature == feature,
            UsageTracking.period_key == period_key,
        )
    )
    return row.count if row else 0


def check_usage(session: Session, user_id: int, feature: str, tier: str) -> dict:
    """
    Returns {"allowed": bool, "warning": bool, "count": int, "hard_cap": int|None}.
    Increments count before checking.
    Raises ValueError if feature is completely blocked (hard cap = 0).
    """
    limits = USAGE_LIMITS.get(tier, {}).get(feature, {})
    hard = limits.get("hard", None)
    soft = limits.get("soft", None)

    if hard == 0:
        return {"allowed": False, "warning": False, "count": 0, "hard_cap": 0}

    count = increment_usage(session, user_id, feature)

    if hard is not None and count > hard:
        return {"allowed": False, "warning": False, "count": count, "hard_cap": hard}

    warning = soft is not None and count >= soft
    return {"allowed": True, "warning": warning, "count": count, "hard_cap": hard}

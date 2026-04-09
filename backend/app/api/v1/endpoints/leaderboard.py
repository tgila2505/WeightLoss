import re

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.health_metrics import HealthMetrics
from app.models.user import User
from app.schemas.leaderboard import LeaderboardEntry, LeaderboardOut

router = APIRouter(prefix="/leaderboard")

_LEADERBOARD_LIMIT = 50


def _mask_email(email: str) -> str:
    """Mask email: al***@***.com"""
    local, _, domain = email.partition("@")
    parts = domain.rsplit(".", 1)
    masked_local = local[:2] + "***" if len(local) > 2 else local[0] + "***"
    masked_domain = parts[0][:3] + "***" if len(parts[0]) > 3 else parts[0]
    tld = parts[1] if len(parts) > 1 else ""
    return f"{masked_local}@{masked_domain}.{tld}" if tld else f"{masked_local}@{masked_domain}"


@router.get("", response_model=LeaderboardOut)
def get_leaderboard(session: Session = Depends(get_db_session)) -> LeaderboardOut:
    """Return top users by weight lost, only those who have opted in."""
    # Count total opted-in users
    total_opted_in: int = session.scalar(
        select(func.count()).select_from(User).where(User.leaderboard_opt_in.is_(True))
    ) or 0

    # For each opted-in user: first recorded weight and latest recorded weight
    first_weight_sq = (
        select(
            HealthMetrics.user_id,
            func.first_value(HealthMetrics.weight_kg)
            .over(
                partition_by=HealthMetrics.user_id,
                order_by=HealthMetrics.recorded_at.asc(),
            )
            .label("first_weight"),
            func.first_value(HealthMetrics.weight_kg)
            .over(
                partition_by=HealthMetrics.user_id,
                order_by=HealthMetrics.recorded_at.desc(),
            )
            .label("latest_weight"),
            func.count()
            .over(partition_by=HealthMetrics.user_id)
            .label("record_count"),
        )
        .distinct(HealthMetrics.user_id)
        .subquery()
    )

    rows = session.execute(
        select(
            User.id,
            User.email,
            first_weight_sq.c.first_weight,
            first_weight_sq.c.latest_weight,
            first_weight_sq.c.record_count,
        )
        .join(first_weight_sq, first_weight_sq.c.user_id == User.id)
        .where(User.leaderboard_opt_in.is_(True))
        .order_by(
            (first_weight_sq.c.first_weight - first_weight_sq.c.latest_weight).desc()
        )
        .limit(_LEADERBOARD_LIMIT)
    ).all()

    entries = [
        LeaderboardEntry(
            rank=idx + 1,
            username=_mask_email(row.email),
            weight_lost_kg=round(float(row.first_weight) - float(row.latest_weight), 2),
            weeks_tracked=max(1, row.record_count // 7),
        )
        for idx, row in enumerate(rows)
        if float(row.first_weight) > float(row.latest_weight)
    ]

    return LeaderboardOut(entries=entries, total_opted_in=total_opted_in)

import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.billing import CoachingSession, WeeklyReport
from app.models.funnel import UserSubscription

logger = logging.getLogger(__name__)


def trigger_weekly_reports(session: Session) -> int:
    """Queue weekly reports for all active Pro+ users. Returns count triggered."""
    week_key = date.today().strftime("%Y-W%W")
    pro_plus_subs = session.scalars(
        select(UserSubscription).where(
            UserSubscription.tier == "pro_plus",
            UserSubscription.status.in_(["active", "trialing"]),
        )
    ).all()

    triggered = 0
    for sub in pro_plus_subs:
        existing = session.scalar(
            select(WeeklyReport).where(
                WeeklyReport.user_id == sub.user_id,
                WeeklyReport.week_key == week_key,
            )
        )
        if existing:
            continue
        report = WeeklyReport(user_id=sub.user_id, week_key=week_key, status="pending")
        session.add(report)
        triggered += 1

    session.commit()
    logger.info("Triggered %d weekly reports for week %s", triggered, week_key)
    return triggered

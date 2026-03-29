"""Background reminder dispatcher.

Runs on a 1-minute interval (wired via APScheduler in app.main).
Queries active reminders whose scheduled_time falls within the current UTC
minute and logs each dispatch event.  In production, replace the logger.info
call with your delivery transport (email, push notification, SMS, etc.).
"""

from datetime import datetime, timezone

from sqlalchemy import select

from app.core.logging import get_logger
from app.db.session import SessionLocal
from app.models.reminder import Reminder

logger = get_logger(__name__)


def dispatch_due_reminders() -> None:
    """Find and dispatch all active reminders due in the current minute."""
    now = datetime.now(tz=timezone.utc)
    minute_start = now.replace(second=0, microsecond=0).time()
    minute_end = now.replace(second=59, microsecond=999999).time()

    with SessionLocal() as session:
        statement = (
            select(Reminder)
            .where(Reminder.is_active.is_(True))
            .where(Reminder.scheduled_time >= minute_start)
            .where(Reminder.scheduled_time <= minute_end)
        )
        due_reminders = list(session.scalars(statement).all())

    if not due_reminders:
        return

    for reminder in due_reminders:
        logger.info(
            "Dispatching reminder id=%d user_id=%d title=%r type=%r scheduled=%s cadence=%s",
            reminder.id,
            reminder.user_id,
            reminder.title,
            reminder.reminder_type,
            reminder.scheduled_time.isoformat(),
            reminder.cadence,
        )

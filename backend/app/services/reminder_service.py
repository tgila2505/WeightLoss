from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.reminder import Reminder
from app.models.user import User
from app.schemas.reminder import ReminderCreate


class ReminderService:
    def create_reminder(
        self,
        session: Session,
        user: User,
        payload: ReminderCreate,
    ) -> Reminder:
        reminder = Reminder(user_id=user.id, **payload.model_dump())
        session.add(reminder)
        session.commit()
        session.refresh(reminder)
        return reminder

    def list_reminders(self, session: Session, user: User) -> list[Reminder]:
        statement = (
            select(Reminder)
            .where(Reminder.user_id == user.id)
            .order_by(Reminder.scheduled_time.asc(), Reminder.id.asc())
        )
        return list(session.scalars(statement).all())

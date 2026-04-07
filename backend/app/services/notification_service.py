from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.habits import NotificationPreferences
from app.models.reports import NotificationEvent
from app.models.user import User
from app.schemas.notifications import (
    NotificationEventResponse,
    NotificationInboxResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
)


class NotificationService:
    def get_preferences(self, session: Session, user: User) -> NotificationPreferencesResponse:
        prefs = self._get_or_create_prefs(session, user)
        return NotificationPreferencesResponse.model_validate(prefs)

    def update_preferences(
        self, session: Session, user: User, payload: NotificationPreferencesUpdate
    ) -> NotificationPreferencesResponse:
        prefs = self._get_or_create_prefs(session, user)
        for field, value in payload.model_dump(exclude_none=True).items():
            setattr(prefs, field, value)
        prefs.updated_at = datetime.now(timezone.utc)
        session.commit()
        session.refresh(prefs)
        return NotificationPreferencesResponse.model_validate(prefs)

    def register_push_subscription(self, session: Session, user: User, subscription: dict) -> None:
        prefs = self._get_or_create_prefs(session, user)
        prefs.push_subscription = subscription
        prefs.push_enabled = True
        prefs.updated_at = datetime.now(timezone.utc)
        session.commit()

    def remove_push_subscription(self, session: Session, user: User) -> None:
        prefs = self._get_or_create_prefs(session, user)
        prefs.push_subscription = None
        session.commit()

    def get_inbox(self, session: Session, user: User, limit: int = 20) -> NotificationInboxResponse:
        events = list(session.scalars(
            select(NotificationEvent)
            .where(
                NotificationEvent.user_id == user.id,
                NotificationEvent.channel == "in_app",
                NotificationEvent.status.in_(["pending", "sent"]),
            )
            .order_by(NotificationEvent.created_at.desc())
            .limit(limit)
        ))

        unread = sum(1 for e in events if e.opened_at is None and e.dismissed_at is None)
        return NotificationInboxResponse(
            unread_count=unread,
            notifications=[NotificationEventResponse.model_validate(e) for e in events],
        )

    def dismiss_notification(self, session: Session, user: User, notification_id) -> bool:
        import uuid
        event = session.scalar(
            select(NotificationEvent).where(
                NotificationEvent.id == notification_id,
                NotificationEvent.user_id == user.id,
            )
        )
        if not event:
            return False
        event.dismissed_at = datetime.now(timezone.utc)
        event.status = "dismissed"
        session.commit()
        return True

    def create_in_app_notification(
        self,
        session: Session,
        user_id: int,
        notification_type: str,
        title: str,
        body: str | None = None,
        payload: dict | None = None,
    ) -> NotificationEvent:
        event = NotificationEvent(
            user_id=user_id,
            type=notification_type,
            channel="in_app",
            title=title,
            body=body,
            payload=payload,
            status="sent",
            sent_at=datetime.now(timezone.utc),
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        return event

    def _get_or_create_prefs(self, session: Session, user: User) -> NotificationPreferences:
        prefs = session.get(NotificationPreferences, user.id)
        if prefs is None:
            prefs = NotificationPreferences(user_id=user.id)
            session.add(prefs)
            session.flush()
        return prefs


notification_service = NotificationService()

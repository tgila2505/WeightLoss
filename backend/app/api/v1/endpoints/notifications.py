import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.notifications import (
    NotificationInboxResponse,
    NotificationPreferencesResponse,
    NotificationPreferencesUpdate,
    PushSubscribeRequest,
)
from app.services.notification_service import notification_service

router = APIRouter(prefix="/notifications")


@router.get("/preferences", response_model=NotificationPreferencesResponse)
def get_notification_preferences(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesResponse:
    return notification_service.get_preferences(session, current_user)


@router.put("/preferences", response_model=NotificationPreferencesResponse)
def update_notification_preferences(
    payload: NotificationPreferencesUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> NotificationPreferencesResponse:
    return notification_service.update_preferences(session, current_user, payload)


@router.post("/push/subscribe", status_code=status.HTTP_204_NO_CONTENT)
def subscribe_push(
    payload: PushSubscribeRequest,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    notification_service.register_push_subscription(session, current_user, payload.subscription)


@router.delete("/push/unsubscribe", status_code=status.HTTP_204_NO_CONTENT)
def unsubscribe_push(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    notification_service.remove_push_subscription(session, current_user)


@router.get("/inbox", response_model=NotificationInboxResponse)
def get_inbox(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> NotificationInboxResponse:
    return notification_service.get_inbox(session, current_user)


@router.post("/inbox/{notification_id}/dismiss", status_code=status.HTTP_204_NO_CONTENT)
def dismiss_notification(
    notification_id: uuid.UUID,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> None:
    ok = notification_service.dismiss_notification(session, current_user, notification_id)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")

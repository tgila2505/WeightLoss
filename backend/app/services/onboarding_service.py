import logging

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.onboarding import OnboardingState
from app.models.user import User
from app.schemas.onboarding import OnboardingStateUpdate

logger = logging.getLogger(__name__)


class OnboardingService:
    def get_state(self, session: Session, user: User) -> OnboardingState | None:
        return session.scalar(
            select(OnboardingState).where(OnboardingState.user_id == user.id)
        )

    def upsert_state(
        self, session: Session, user: User, payload: OnboardingStateUpdate
    ) -> OnboardingState:
        state = self.get_state(session, user)
        if state is None:
            state = OnboardingState(user_id=user.id)
            session.add(state)

        state.current_step = payload.current_step
        state.form_data = payload.form_data
        state.completed = payload.completed
        session.commit()
        session.refresh(state)
        logger.info(
            "onboarding_state_saved user_id=%s step=%s completed=%s",
            user.id,
            payload.current_step,
            payload.completed,
        )
        return state

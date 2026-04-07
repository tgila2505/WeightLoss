from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.gamification import GamificationStatusResponse, NextMilestone, StreakDetail
from app.services.streak_service import compute_next_milestone, get_or_create_streak


class GamificationService:
    def get_status(self, session: Session, user: User) -> GamificationStatusResponse:
        record = get_or_create_streak(session, user)
        session.commit()

        next_m = compute_next_milestone(record)
        freeze_available = not record.streak_freeze_used

        return GamificationStatusResponse(
            streak=StreakDetail(
                current=record.current_streak,
                longest=record.longest_streak,
                last_checkin_date=record.last_checkin_date,
                freeze_available=freeze_available,
                freeze_resets_at=record.freeze_resets_at,
            ),
            total_checkins=record.total_checkins,
            badges=record.badges_earned or [],
            next_milestone=NextMilestone(**next_m) if next_m else None,
        )


gamification_service = GamificationService()

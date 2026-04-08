import os
from datetime import date, datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.habits import HabitLog, ProgressEntry, StreakRecord
from app.models.user import User
from app.schemas.habits import CheckInCreate, CheckInResponse, CheckInTodayResponse, StreakSummary
from app.services.streak_service import compute_next_milestone, get_or_create_streak, update_streak

AI_SERVICES_URL = os.getenv("AI_SERVICES_INTERNAL_URL", "http://localhost:8001")


class HabitService:
    def submit_checkin(
        self,
        session: Session,
        user: User,
        payload: CheckInCreate,
        background_tasks=None,
    ) -> CheckInResponse:
        today = date.today()

        # Upsert habit_log (idempotent)
        existing = session.scalar(
            select(HabitLog).where(HabitLog.user_id == user.id, HabitLog.log_date == today)
        )

        if existing:
            log = existing
            log.mood = payload.mood
            log.adherence = payload.adherence
            if payload.weight_kg is not None:
                log.weight_kg = payload.weight_kg
            if payload.notes is not None:
                log.notes = payload.notes
            log.submitted_at = datetime.now(timezone.utc)
        else:
            log = HabitLog(
                user_id=user.id,
                log_date=today,
                mood=payload.mood,
                adherence=payload.adherence,
                weight_kg=payload.weight_kg,
                notes=payload.notes,
            )
            session.add(log)
            session.flush()

        # Update progress_entry if weight provided
        if payload.weight_kg is not None:
            self._upsert_progress_entry(session, user, today, payload.weight_kg)
            # Award weight-related badges
            self._check_weight_milestones(session, user, payload.weight_kg)

        # Update streak
        streak_record, milestone_earned = update_streak(session, user, today)
        session.commit()
        session.refresh(log)

        # Determine AI feedback status
        ai_feedback_status = "ready" if log.ai_feedback else "generating"
        ai_feedback = log.ai_feedback if log.ai_feedback else None

        # Dispatch async AI feedback if not already generated
        if not log.ai_feedback and background_tasks is not None:
            background_tasks.add_task(self._generate_ai_feedback, log.id, user.id)

        return CheckInResponse(
            log_date=today,
            streak=StreakSummary(
                current=streak_record.current_streak,
                longest=streak_record.longest_streak,
                milestone_earned=milestone_earned,
            ),
            ai_feedback_status=ai_feedback_status,
            ai_feedback=ai_feedback,
        )

    def get_today_checkin(self, session: Session, user: User) -> CheckInTodayResponse:
        today = date.today()
        log = session.scalar(
            select(HabitLog).where(HabitLog.user_id == user.id, HabitLog.log_date == today)
        )
        if not log:
            return CheckInTodayResponse(submitted=False)

        return CheckInTodayResponse(
            submitted=True,
            log_date=log.log_date,
            mood=log.mood,
            adherence=log.adherence,
            weight_kg=float(log.weight_kg) if log.weight_kg else None,
            ai_feedback=log.ai_feedback,
        )

    def get_feedback_status(self, session: Session, user: User) -> dict:
        today = date.today()
        log = session.scalar(
            select(HabitLog).where(HabitLog.user_id == user.id, HabitLog.log_date == today)
        )
        if not log:
            return {"status": "no_checkin"}
        if log.ai_feedback:
            return {"status": "ready", "ai_feedback": log.ai_feedback}
        return {"status": "generating"}

    def _upsert_progress_entry(
        self, session: Session, user: User, entry_date: date, weight_kg: float
    ) -> None:
        existing = session.scalar(
            select(ProgressEntry).where(
                ProgressEntry.user_id == user.id, ProgressEntry.entry_date == entry_date
            )
        )
        if existing:
            existing.weight_kg = weight_kg
        else:
            entry = ProgressEntry(
                user_id=user.id,
                entry_date=entry_date,
                weight_kg=weight_kg,
                source="checkin",
            )
            session.add(entry)

    def _check_weight_milestones(
        self, session: Session, user: User, current_weight: float
    ) -> None:
        from app.services.streak_service import award_progress_badge

        # Need start weight — get from profile or first progress_entry
        first_entry = session.scalar(
            select(ProgressEntry)
            .where(ProgressEntry.user_id == user.id)
            .order_by(ProgressEntry.entry_date.asc())
        )
        if not first_entry or not first_entry.weight_kg:
            return

        start_weight = float(first_entry.weight_kg)
        lost = start_weight - current_weight

        if lost >= 1.0:
            award_progress_badge(session, user, "first_kilo")
            award_progress_badge(session, user, "data_nerd")

        # Goal weight from profile
        profile = getattr(user, "profile", None)
        if profile and hasattr(profile, "goal_weight") and profile.goal_weight:
            goal = float(profile.goal_weight)
            total_delta = start_weight - goal
            if total_delta > 0:
                pct = lost / total_delta
                if pct >= 0.5:
                    award_progress_badge(session, user, "halfway")
                if current_weight <= goal:
                    award_progress_badge(session, user, "goal_reached")

    def _generate_ai_feedback(self, log_id, user_id: int) -> None:
        """Called as background task. Calls ai-services and writes feedback back."""
        from app.db.session import SessionLocal

        session = SessionLocal()
        try:
            log = session.get(HabitLog, log_id)
            if not log or log.ai_feedback:
                return

            # Gather context: last 7 logs
            recent_logs = list(session.scalars(
                select(HabitLog)
                .where(HabitLog.user_id == user_id)
                .order_by(HabitLog.log_date.desc())
                .limit(7)
            ))

            streak = session.get(StreakRecord, user_id)
            streak_len = streak.current_streak if streak else 0

            payload = {
                "user_id": user_id,
                "habit_log_id": str(log_id),
                "recent_logs": [
                    {
                        "log_date": str(l.log_date),
                        "mood": l.mood,
                        "adherence": l.adherence,
                        "weight_kg": float(l.weight_kg) if l.weight_kg else None,
                    }
                    for l in recent_logs
                ],
                "streak_length": streak_len,
            }

            try:
                response = httpx.post(
                    f"{AI_SERVICES_URL}/internal/feedback/daily",
                    json=payload,
                    timeout=30.0,
                )
                response.raise_for_status()
                feedback = response.json()
                log.ai_feedback = feedback
                log.ai_generated_at = datetime.now(timezone.utc)
                session.commit()
            except Exception:
                pass  # Feedback is best-effort; don't fail check-in
        finally:
            session.close()


habit_service = HabitService()

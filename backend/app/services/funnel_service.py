import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.funnel import AnonymousSession, ConversionEvent, UserSubscription

_ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "high": 1.725,
    "very_high": 1.9,
}

_STATS_CACHE: dict[str, Any] = {}
_STATS_TTL_SECONDS = 300
_STATS_SEED_PLANS = 14280


class FunnelService:
    def create_session(self, session: Session, profile_data: dict[str, Any]) -> AnonymousSession:
        now = datetime.now(UTC)
        anon = AnonymousSession(
            session_token=uuid.uuid4(),
            profile_data=profile_data,
            created_at=now,
            expires_at=now + timedelta(hours=72),
        )
        session.add(anon)
        session.commit()
        session.refresh(anon)
        return anon

    def get_session_by_token(
        self, session: Session, token: uuid.UUID
    ) -> AnonymousSession | None:
        return session.scalar(
            select(AnonymousSession).where(AnonymousSession.session_token == token)
        )

    def calculate_preview(self, profile_data: dict[str, Any]) -> dict[str, Any]:
        weight = float(profile_data.get("weight_kg", 0))
        height = float(profile_data.get("height_cm", 0))
        age = int(profile_data.get("age", 0))
        gender = str(profile_data.get("gender", "male")).lower()
        activity = str(profile_data.get("activity_level", "moderate")).lower()
        goal_weight = float(profile_data.get("goal_weight_kg", weight))
        timeline = int(profile_data.get("timeline_weeks", 12))

        # Mifflin-St Jeor BMR
        if gender == "female":
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age + 5

        multiplier = _ACTIVITY_MULTIPLIERS.get(activity, 1.55)
        tdee = bmr * multiplier
        deficit = 500
        calorie_target = round(tdee - deficit)

        # Macro split: Protein 30%, Carbs 40%, Fat 30%
        protein_g = round(calorie_target * 0.30 / 4)
        carbs_g = round(calorie_target * 0.40 / 4)
        fat_g = round(calorie_target * 0.30 / 9)
        # ~0.45 kg/week at 500 kcal deficit (3500 kcal per 0.45 kg)
        weekly_loss_kg = round((deficit * 7) / 7700, 2)

        return {
            "name": str(profile_data.get("name", "")),
            "goal_weight_kg": goal_weight,
            "timeline_weeks": timeline,
            "calories": calorie_target,
            "protein_g": protein_g,
            "carbs_g": carbs_g,
            "fat_g": fat_g,
            "deficit_rate": deficit,
            "weekly_loss_kg_estimate": weekly_loss_kg,
        }

    def track_event(
        self,
        session: Session,
        event_name: str,
        session_token: uuid.UUID | None,
        user_id: int | None,
        properties: dict[str, Any],
    ) -> None:
        """Fire-and-forget — caller must commit."""
        event = ConversionEvent(
            event_name=event_name,
            session_token=session_token,
            user_id=user_id,
            properties=properties,
        )
        session.add(event)

    def get_stats(self, session: Session) -> dict[str, int]:
        now = datetime.now(UTC).timestamp()
        cached_at = _STATS_CACHE.get("cached_at", 0.0)
        if now - cached_at < _STATS_TTL_SECONDS and "data" in _STATS_CACHE:
            return _STATS_CACHE["data"]  # type: ignore[return-value]

        def count(name: str) -> int:
            return session.scalar(
                select(func.count()).select_from(ConversionEvent).where(
                    ConversionEvent.event_name == name
                )
            ) or 0

        conversions = count("conversion_completed")
        data: dict[str, int] = {
            "landing_views": count("landing_viewed"),
            "onboarding_starts": count("onboarding_started"),
            "onboarding_completions": count("onboarding_step_completed"),
            "preview_views": count("preview_viewed"),
            "upgrade_clicks": count("upgrade_clicked"),
            "conversions": conversions,
            "plans_generated": _STATS_SEED_PLANS + conversions,
        }
        _STATS_CACHE["data"] = data
        _STATS_CACHE["cached_at"] = now
        return data

    def get_subscription_access(self, session: Session, user_id: int) -> dict[str, Any]:
        sub = session.scalar(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        if sub is None:
            return {"tier": "free", "trial_active": False}
        trial_active = (
            sub.trial_expires_at is not None
            and sub.trial_expires_at.replace(tzinfo=UTC) > datetime.now(UTC)
        )
        return {"tier": sub.tier, "trial_active": trial_active, "status": sub.status}

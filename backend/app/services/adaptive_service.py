from sqlalchemy.orm import Session

from app.models.adherence import AdherenceRecord
from app.models.user import User
from app.schemas.adherence import AdaptiveAdjustment, AdherenceSummaryResponse


class AdaptiveService:
    def build_summary(
        self,
        records: list[AdherenceRecord],
    ) -> AdherenceSummaryResponse:
        total_records = len(records)
        completed_records = sum(1 for record in records if record.completed)
        adherence_score = (
            round(completed_records / total_records, 2) if total_records > 0 else 0.0
        )

        if adherence_score >= 0.8:
            consistency_level = "high"
            adjustments = AdaptiveAdjustment(
                meal_adjustment="maintain_current_meals",
                activity_adjustment="maintain_current_activity",
                action_adjustment="keep_current_actions",
            )
        elif adherence_score >= 0.5:
            consistency_level = "moderate"
            adjustments = AdaptiveAdjustment(
                meal_adjustment="simplify_some_meals",
                activity_adjustment="keep_activity_light",
                action_adjustment="focus_on_top_actions",
            )
        else:
            consistency_level = "low"
            adjustments = AdaptiveAdjustment(
                meal_adjustment="simplify_all_meals",
                activity_adjustment="reduce_activity_intensity",
                action_adjustment="focus_on_one_action",
            )

        return AdherenceSummaryResponse(
            adherence_score=adherence_score,
            consistency_level=consistency_level,
            completed_records=completed_records,
            total_records=total_records,
            adjustments=adjustments,
        )

    def update_user(
        self,
        session: Session,
        user: User,
        summary: AdherenceSummaryResponse,
    ) -> User:
        previous_level = user.consistency_level
        if previous_level is not None and previous_level != summary.consistency_level:
            user.plan_refresh_needed = True
        user.adherence_score = summary.adherence_score
        user.consistency_level = summary.consistency_level
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

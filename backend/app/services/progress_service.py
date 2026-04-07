from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.habits import ProgressEntry
from app.models.user import User
from app.schemas.progress import ChartPoint, ProgressEntryCreate, ProgressEntryResponse, ProgressSummaryResponse


class ProgressService:
    def get_summary(self, session: Session, user: User, days: int = 30) -> ProgressSummaryResponse:
        # Get all entries for trend calculation
        all_entries = list(session.scalars(
            select(ProgressEntry)
            .where(ProgressEntry.user_id == user.id, ProgressEntry.weight_kg.isnot(None))
            .order_by(ProgressEntry.entry_date.asc())
        ))

        if not all_entries:
            return ProgressSummaryResponse(
                goal_weight_kg=None,
                start_weight_kg=None,
                current_weight_kg=None,
                total_lost_kg=None,
                goal_delta_kg=None,
                goal_pct=None,
                trend_slope_14d=None,
                plateau_detected=False,
                estimated_weeks_remaining=None,
                chart_data=[],
            )

        start_weight = float(all_entries[0].weight_kg)
        current_weight = float(all_entries[-1].weight_kg)

        # Goal from profile
        goal_weight: float | None = None
        profile = getattr(user, "profile", None)
        if profile and hasattr(profile, "goal_weight") and profile.goal_weight:
            goal_weight = float(profile.goal_weight)

        total_lost = round(start_weight - current_weight, 2)
        goal_delta = round(current_weight - goal_weight, 2) if goal_weight else None
        total_delta = start_weight - goal_weight if goal_weight else None
        goal_pct: int | None = None
        if total_delta and total_delta > 0:
            goal_pct = min(100, int((start_weight - current_weight) / total_delta * 100))

        # 14-day trend slope (kg/week)
        cutoff_14d = date.today() - timedelta(days=14)
        recent_14d = [e for e in all_entries if e.entry_date >= cutoff_14d and e.weight_kg]
        trend_slope = self._linear_slope(recent_14d) if len(recent_14d) >= 2 else None

        # Plateau detection: abs slope < 0.3 kg / 14 days
        plateau_detected = abs(trend_slope) < (0.3 / 14 * 7) if trend_slope is not None else False

        # Estimated weeks remaining
        est_weeks: int | None = None
        if goal_delta and trend_slope and trend_slope < 0:
            weeks = abs(goal_delta) / abs(trend_slope)
            est_weeks = max(1, round(weeks))

        # Chart data: requested window
        cutoff_chart = date.today() - timedelta(days=days)
        chart_entries = [e for e in all_entries if e.entry_date >= cutoff_chart]
        chart_data = self._build_chart(chart_entries)

        return ProgressSummaryResponse(
            goal_weight_kg=goal_weight,
            start_weight_kg=start_weight,
            current_weight_kg=current_weight,
            total_lost_kg=total_lost,
            goal_delta_kg=goal_delta,
            goal_pct=goal_pct,
            trend_slope_14d=round(trend_slope, 3) if trend_slope is not None else None,
            plateau_detected=plateau_detected,
            estimated_weeks_remaining=est_weeks,
            chart_data=chart_data,
        )

    def get_entries(
        self, session: Session, user: User,
        from_date: date | None = None,
        to_date: date | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[ProgressEntryResponse]:
        stmt = select(ProgressEntry).where(ProgressEntry.user_id == user.id)
        if from_date:
            stmt = stmt.where(ProgressEntry.entry_date >= from_date)
        if to_date:
            stmt = stmt.where(ProgressEntry.entry_date <= to_date)
        stmt = stmt.order_by(ProgressEntry.entry_date.desc()).limit(limit).offset(offset)
        return [ProgressEntryResponse.model_validate(e) for e in session.scalars(stmt)]

    def create_entry(
        self, session: Session, user: User, payload: ProgressEntryCreate
    ) -> ProgressEntryResponse:
        entry_date = payload.entry_date or date.today()
        existing = session.scalar(
            select(ProgressEntry).where(
                ProgressEntry.user_id == user.id,
                ProgressEntry.entry_date == entry_date,
            )
        )
        if existing:
            if payload.weight_kg is not None:
                existing.weight_kg = payload.weight_kg
            if payload.body_fat_pct is not None:
                existing.body_fat_pct = payload.body_fat_pct
            if payload.notes is not None:
                existing.notes = payload.notes
            existing.source = "manual"
            session.commit()
            session.refresh(existing)
            return ProgressEntryResponse.model_validate(existing)

        entry = ProgressEntry(
            user_id=user.id,
            entry_date=entry_date,
            weight_kg=payload.weight_kg,
            body_fat_pct=payload.body_fat_pct,
            notes=payload.notes,
            source="manual",
        )
        session.add(entry)
        session.commit()
        session.refresh(entry)
        return ProgressEntryResponse.model_validate(entry)

    def _linear_slope(self, entries: list[ProgressEntry]) -> float:
        """Returns kg/week slope via linear regression on dates."""
        if len(entries) < 2:
            return 0.0
        base_date = entries[0].entry_date
        xs = [(e.entry_date - base_date).days for e in entries]
        ys = [float(e.weight_kg) for e in entries]
        n = len(xs)
        mean_x = sum(xs) / n
        mean_y = sum(ys) / n
        num = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
        den = sum((xs[i] - mean_x) ** 2 for i in range(n))
        if den == 0:
            return 0.0
        slope_per_day = num / den
        return slope_per_day * 7  # convert to kg/week

    def _build_chart(self, entries: list[ProgressEntry]) -> list[ChartPoint]:
        if not entries:
            return []

        weights = [float(e.weight_kg) if e.weight_kg else None for e in entries]
        rolling: list[float | None] = []
        for i, e in enumerate(entries):
            window = [w for w in weights[max(0, i - 6):i + 1] if w is not None]
            rolling.append(round(sum(window) / len(window), 2) if window else None)

        return [
            ChartPoint(
                date=entries[i].entry_date,
                weight_kg=weights[i],
                rolling_avg=rolling[i],
            )
            for i in range(len(entries))
        ]


progress_service = ProgressService()

import os
import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.habits import HabitLog, ProgressEntry, StreakRecord
from app.models.reports import AiReport, NotificationEvent
from app.models.user import User
from app.schemas.reports import ReportResponse

AI_SERVICES_URL = os.getenv("AI_SERVICES_INTERNAL_URL", "http://localhost:8001")


class ReportService:
    def get_weekly_report(
        self, session: Session, user: User, period_key: str | None = None
    ) -> ReportResponse | None:
        if period_key is None:
            period_key = _current_week_key()
        report = session.scalar(
            select(AiReport).where(
                AiReport.user_id == user.id,
                AiReport.report_type == "weekly",
                AiReport.period_key == period_key,
            )
        )
        if not report:
            return None
        return ReportResponse.model_validate(report)

    def get_behavioral_report(self, session: Session, user: User) -> ReportResponse | None:
        period_key = date.today().strftime("%Y-%m")
        report = session.scalar(
            select(AiReport).where(
                AiReport.user_id == user.id,
                AiReport.report_type == "behavioral_insights",
                AiReport.period_key == period_key,
            )
        )
        if not report:
            return None
        return ReportResponse.model_validate(report)

    def accept_adjustment(self, session: Session, user: User, report_id: uuid.UUID) -> bool:
        report = session.scalar(
            select(AiReport).where(AiReport.id == report_id, AiReport.user_id == user.id)
        )
        if not report or not report.adjustments:
            return False
        if report.adjustment_accepted_at is not None:
            return False
        report.adjustment_accepted_at = datetime.now(timezone.utc)
        session.commit()
        return True

    def generate_weekly_report(self, session: Session, user: User) -> AiReport:
        """Generate weekly report for user. Called by cron or admin trigger."""
        period_key = _current_week_key()

        existing = session.scalar(
            select(AiReport).where(
                AiReport.user_id == user.id,
                AiReport.report_type == "weekly",
                AiReport.period_key == period_key,
            )
        )
        if existing and existing.status == "ready":
            return existing

        if existing:
            existing.status = "generating"
            session.commit()
            report = existing
        else:
            report = AiReport(
                user_id=user.id,
                report_type="weekly",
                period_key=period_key,
                content={},
                status="generating",
            )
            session.add(report)
            session.commit()
            session.refresh(report)

        try:
            content = self._build_weekly_content(session, user)
            adjustments = self._check_plan_adjustments(session, user, content)
            report.content = content
            report.adjustments = adjustments
            report.status = "ready"
            report.generated_at = datetime.now(timezone.utc)
            session.commit()

            # Fire in-app notification
            notif = NotificationEvent(
                user_id=user.id,
                type="report_ready",
                channel="in_app",
                title="Your weekly report is ready",
                body="See how your week went and what to focus on next.",
                status="sent",
                sent_at=datetime.now(timezone.utc),
            )
            session.add(notif)
            report.notified_at = datetime.now(timezone.utc)
            session.commit()
        except Exception:
            report.status = "failed"
            session.commit()
            raise

        return report

    def _build_weekly_content(self, session: Session, user: User) -> dict:
        week_start = date.today() - timedelta(days=7)
        logs = list(session.scalars(
            select(HabitLog)
            .where(HabitLog.user_id == user.id, HabitLog.log_date >= week_start)
            .order_by(HabitLog.log_date.asc())
        ))

        total = len(logs)
        on_track = sum(1 for l in logs if l.adherence == "on_track")
        adherence_pct = round(on_track / total * 100) if total else 0
        completion_days = total

        weights = [float(l.weight_kg) for l in logs if l.weight_kg]
        weight_change = round(weights[-1] - weights[0], 2) if len(weights) >= 2 else None

        moods = [(l.log_date, l.mood, l.adherence) for l in logs if l.mood]
        best_day = max(moods, key=lambda x: (x[1] or 0, 1 if x[2] == "on_track" else 0)) if moods else None
        worst_day = min(moods, key=lambda x: (x[1] or 5, 0 if x[2] == "off_track" else 1)) if moods else None

        streak = session.get(StreakRecord, user.id)
        streak_len = streak.current_streak if streak else 0

        trend_narrative = self._generate_trend_narrative_simple(adherence_pct, weight_change, streak_len)
        top_insight = self._generate_top_insight(logs)
        next_focus = self._generate_next_focus(adherence_pct, logs)

        return {
            "adherence_pct": adherence_pct,
            "completion_days": completion_days,
            "weight_change_kg": weight_change,
            "best_day": str(best_day[0]) if best_day else None,
            "worst_day": str(worst_day[0]) if worst_day else None,
            "trend_narrative": trend_narrative,
            "top_insight": top_insight,
            "next_week_focus": next_focus,
            "period_start": str(week_start),
            "period_end": str(date.today()),
        }

    def _generate_trend_narrative_simple(
        self, adherence_pct: int, weight_change: float | None, streak: int
    ) -> str:
        if adherence_pct >= 80:
            quality = "a strong week"
        elif adherence_pct >= 50:
            quality = "a decent week with room to grow"
        else:
            quality = "a challenging week"

        narrative = f"You had {quality} with {adherence_pct}% adherence."
        if weight_change is not None:
            direction = "down" if weight_change < 0 else "up"
            narrative += f" Weight moved {direction} {abs(weight_change)} kg."
        if streak > 0:
            narrative += f" Current streak: {streak} days."
        return narrative

    def _generate_top_insight(self, logs: list[HabitLog]) -> str:
        if not logs:
            return "No check-in data for this week."

        # Day-of-week adherence pattern
        day_adherence: dict[int, list[str]] = {}
        for log in logs:
            dow = log.log_date.weekday()
            if log.adherence:
                day_adherence.setdefault(dow, []).append(log.adherence)

        if day_adherence:
            worst_dow = min(
                day_adherence,
                key=lambda d: sum(1 for a in day_adherence[d] if a == "on_track") / len(day_adherence[d]),
            )
            day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
            return (
                f"Your lowest adherence day this week was {day_names[worst_dow]}."
                f" Consider simplifying your {day_names[worst_dow]} meals."
            )

        return "Keep tracking daily to see pattern insights emerge."

    def _generate_next_focus(self, adherence_pct: int, logs: list[HabitLog]) -> str:
        if adherence_pct < 50:
            return "Focus on one meal per day — just make that one meal on plan. Build from there."
        elif adherence_pct < 80:
            return "Aim for 5 out of 7 days fully on track. Identify your hardest day and simplify that day's plan."
        else:
            return "Maintain your excellent consistency. Consider adding a measurement day to track progress."

    def _check_plan_adjustments(
        self, session: Session, user: User, content: dict
    ) -> dict | None:
        """Check for plateau or pattern triggers that warrant a plan adjustment."""
        cutoff = date.today() - timedelta(days=14)
        entries_14d = list(session.scalars(
            select(ProgressEntry)
            .where(
                ProgressEntry.user_id == user.id,
                ProgressEntry.entry_date >= cutoff,
                ProgressEntry.weight_kg.isnot(None),
            )
            .order_by(ProgressEntry.entry_date.asc())
        ))

        if len(entries_14d) >= 5:
            weights = [float(e.weight_kg) for e in entries_14d]
            delta = abs(weights[-1] - weights[0])
            if delta < 0.3:
                return {
                    "type": "calorie_adjustment",
                    "reason": "14-day weight plateau detected. A brief calorie reset may help restart progress.",
                    "proposed_change": {
                        "field": "daily_calorie_target",
                        "note": "Consider a 2-day refeed at maintenance calories, then return to deficit.",
                        "duration_days": 7,
                    },
                }

        adherence_pct = content.get("adherence_pct", 100)
        if adherence_pct < 70:
            return {
                "type": "simplification",
                "reason": "Adherence has been below 70% for this period. Simplifying the meal plan reduces friction.",
                "proposed_change": {
                    "field": "meal_complexity",
                    "note": "Switch to simpler 3-ingredient meals for 2 weeks to rebuild consistency.",
                },
            }

        return None


def _current_week_key() -> str:
    today = date.today()
    iso = today.isocalendar()
    return f"{iso.year}-W{iso.week:02d}"


report_service = ReportService()

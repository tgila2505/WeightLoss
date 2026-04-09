from datetime import date, timedelta

from sqlalchemy.orm import Session

from app.models.habits import StreakRecord
from app.models.user import User

# Badge definitions: id → (label, condition_description)
BADGES = {
    "first_checkin": "First Check-In",
    "week_streak": "1 Week Streak",
    "month_streak": "1 Month Streak",
    "first_kilo": "First Kilo",
    "halfway": "Halfway There",
    "goal_reached": "Goal Reached",
    "10_checkins": "10 Check-Ins",
    "50_checkins": "50 Check-Ins",
    "60_day_streak": "60-Day Streak",
    "100_day_streak": "100-Day Streak",
    "data_nerd": "Data Nerd",
    "ai_explorer": "AI Explorer",
    "weekly_warrior": "Weekly Warrior",
}

STREAK_MILESTONES = [7, 14, 30, 60, 100]
CHECKIN_MILESTONES = [1, 10, 50]


def get_or_create_streak(session: Session, user: User) -> StreakRecord:
    record = session.get(StreakRecord, user.id)
    if record is None:
        record = StreakRecord(user_id=user.id)
        session.add(record)
        session.flush()
    return record


def update_streak(session: Session, user: User, log_date: date) -> tuple[StreakRecord, str | None]:
    """Update streak on check-in. Returns (record, milestone_earned_or_None)."""
    record = get_or_create_streak(session, user)
    today = log_date
    milestone_earned: str | None = None

    if record.last_checkin_date == today:
        # Already checked in today — idempotent, no change
        return record, None

    if record.last_checkin_date == today - timedelta(days=1):
        record.current_streak += 1
    else:
        # Check streak freeze (Pro+ only — simplified: check freeze_resets_at)
        if (
            record.last_checkin_date is not None
            and record.last_checkin_date < today - timedelta(days=1)
            and not record.streak_freeze_used
            and _user_is_pro_plus(user)
        ):
            first_of_month = today.replace(day=1)
            if record.freeze_resets_at is None or record.freeze_resets_at <= today:
                # Apply freeze: preserve streak, mark used
                record.streak_freeze_used = True
                next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
                record.freeze_resets_at = next_month
                record.current_streak += 1
            else:
                record.current_streak = 1
        else:
            record.current_streak = 1

    record.last_checkin_date = today
    record.total_checkins += 1

    if record.current_streak > record.longest_streak:
        record.longest_streak = record.current_streak

    # Reset freeze_used at start of new month
    if record.freeze_resets_at and today >= record.freeze_resets_at:
        record.streak_freeze_used = False
        next_month = (today.replace(day=1) + timedelta(days=32)).replace(day=1)
        record.freeze_resets_at = next_month

    # Award streak badges
    milestone_earned = _check_and_award_badges(record)
    return record, milestone_earned


def _check_and_award_badges(record: StreakRecord) -> str | None:
    earned = set(record.badges_earned or [])
    new_badge: str | None = None

    if record.total_checkins == 1 and "first_checkin" not in earned:
        earned.add("first_checkin")
        new_badge = "first_checkin"
    elif record.total_checkins == 10 and "10_checkins" not in earned:
        earned.add("10_checkins")
        new_badge = "10_checkins"
    elif record.total_checkins == 50 and "50_checkins" not in earned:
        earned.add("50_checkins")
        new_badge = "50_checkins"

    if record.current_streak >= 7 and "week_streak" not in earned:
        earned.add("week_streak")
        new_badge = new_badge or "week_streak"
    if record.current_streak >= 30 and "month_streak" not in earned:
        earned.add("month_streak")
        new_badge = new_badge or "month_streak"
    if record.current_streak >= 60 and "60_day_streak" not in earned:
        earned.add("60_day_streak")
        new_badge = new_badge or "60_day_streak"
    if record.current_streak >= 100 and "100_day_streak" not in earned:
        earned.add("100_day_streak")
        new_badge = new_badge or "100_day_streak"

    record.badges_earned = list(earned)
    return new_badge


def award_progress_badge(session: Session, user: User, badge_id: str) -> bool:
    """Award a progress-based badge. Returns True if newly awarded."""
    record = get_or_create_streak(session, user)
    earned = set(record.badges_earned or [])
    if badge_id not in earned:
        earned.add(badge_id)
        record.badges_earned = list(earned)
        return True
    return False


def compute_next_milestone(record: StreakRecord) -> dict | None:
    for threshold in STREAK_MILESTONES:
        badge_map = {7: "week_streak", 14: "week_streak", 30: "month_streak", 60: "60_day_streak", 100: "100_day_streak"}
        if record.current_streak < threshold:
            return {"type": f"{threshold}_day_streak", "days_remaining": threshold - record.current_streak}
    # Checkin milestones
    for threshold in CHECKIN_MILESTONES:
        badge_map = {1: "first_checkin", 10: "10_checkins", 50: "50_checkins"}
        if record.total_checkins < threshold:
            return {"type": f"{threshold}_checkins", "days_remaining": None}
    return None


def _user_is_pro_plus(user: User) -> bool:
    """Check if user has Pro+ tier via UserSubscription tier field."""
    # Fallback: check premium_until as proxy
    from datetime import datetime, timezone
    if user.premium_until and user.premium_until > datetime.now(timezone.utc):
        return True
    return False

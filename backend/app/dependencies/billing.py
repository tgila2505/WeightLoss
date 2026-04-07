from dataclasses import dataclass
from datetime import UTC, datetime

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.funnel import UserSubscription
from app.models.user import User

TIER_CAPABILITIES: dict[str, dict[str, bool]] = {
    "free": {
        "meal_plan_full": False,
        "weekly_schedule": False,
        "profile_edit": False,
        "ai_plans": False,
        "coaching_insights": False,
        "goal_specific_plans": False,
        "advanced_coaching": False,
        "weekly_ai_report": False,
    },
    "pro": {
        "meal_plan_full": True,
        "weekly_schedule": True,
        "profile_edit": True,
        "ai_plans": True,
        "coaching_insights": True,
        "goal_specific_plans": False,
        "advanced_coaching": False,
        "weekly_ai_report": False,
    },
    "pro_plus": {
        "meal_plan_full": True,
        "weekly_schedule": True,
        "profile_edit": True,
        "ai_plans": True,
        "coaching_insights": True,
        "goal_specific_plans": True,
        "advanced_coaching": True,
        "weekly_ai_report": True,
    },
}

_MINIMUM_TIER: dict[str, str] = {
    "meal_plan_full": "pro",
    "weekly_schedule": "pro",
    "profile_edit": "pro",
    "ai_plans": "pro",
    "coaching_insights": "pro",
    "goal_specific_plans": "pro_plus",
    "advanced_coaching": "pro_plus",
    "weekly_ai_report": "pro_plus",
}


@dataclass
class SubscriptionAccess:
    tier: str
    status: str
    trial_active: bool
    past_due: bool
    cancel_at_period_end: bool
    current_period_end: datetime | None
    interval: str
    stripe_customer_id: str | None
    stripe_subscription_id: str | None


def get_subscription(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SubscriptionAccess:
    sub = session.scalar(select(UserSubscription).where(UserSubscription.user_id == user.id))
    if not sub or sub.status in ("cancelled", "canceled"):
        return SubscriptionAccess(
            tier="free",
            status="cancelled" if sub else "none",
            trial_active=False,
            past_due=False,
            cancel_at_period_end=False,
            current_period_end=None,
            interval="monthly",
            stripe_customer_id=sub.stripe_customer_id if sub else None,
            stripe_subscription_id=sub.stripe_subscription_id if sub else None,
        )
    trial_active = bool(sub.trial_expires_at and sub.trial_expires_at.replace(tzinfo=UTC) > datetime.now(UTC))
    past_due = sub.status == "past_due"
    return SubscriptionAccess(
        tier=sub.tier,
        status=sub.status,
        trial_active=trial_active,
        past_due=past_due,
        cancel_at_period_end=sub.cancel_at_period_end,
        current_period_end=sub.current_period_end,
        interval=getattr(sub, "interval", "monthly"),
        stripe_customer_id=sub.stripe_customer_id,
        stripe_subscription_id=sub.stripe_subscription_id,
    )


def require_capability(capability: str):
    def dependency(access: SubscriptionAccess = Depends(get_subscription)) -> SubscriptionAccess:
        effective_tier = access.tier
        if access.trial_active and effective_tier == "free":
            effective_tier = "pro"
        if not TIER_CAPABILITIES.get(effective_tier, {}).get(capability, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={
                    "code": "FEATURE_GATED",
                    "feature": capability,
                    "upgrade_url": "/funnel/upgrade",
                    "required_tier": _MINIMUM_TIER.get(capability, "pro"),
                },
            )
        return access
    return dependency

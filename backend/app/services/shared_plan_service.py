import secrets
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.shared_plan import SharedPlan

_SLUG_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
_SLUG_LENGTH = 16


def _generate_slug() -> str:
    return "".join(secrets.choice(_SLUG_CHARS) for _ in range(_SLUG_LENGTH))


def create_shared_plan(session: Session, user_id: int, plan_data: dict) -> SharedPlan:
    """Create a new shareable plan link with a unique slug."""
    for _ in range(10):
        slug = _generate_slug()
        if not session.scalar(select(SharedPlan).where(SharedPlan.slug == slug)):
            break

    plan = SharedPlan(user_id=user_id, slug=slug, plan_data=plan_data)
    session.add(plan)
    session.commit()
    session.refresh(plan)
    return plan


def get_shared_plan_by_slug(session: Session, slug: str) -> SharedPlan | None:
    """Return an active, non-expired shared plan or None."""
    now = datetime.now(UTC).replace(tzinfo=None)
    plan = session.scalar(
        select(SharedPlan).where(
            SharedPlan.slug == slug,
            SharedPlan.is_active.is_(True),
        )
    )
    if plan is None:
        return None
    if plan.expires_at is not None and plan.expires_at < now:
        return None
    return plan


def increment_view_count(session: Session, plan: SharedPlan) -> None:
    plan.views += 1
    session.commit()


def deactivate_plan(session: Session, plan: SharedPlan) -> None:
    plan.is_active = False
    session.commit()


def list_user_plans(session: Session, user_id: int) -> list[SharedPlan]:
    return list(
        session.scalars(
            select(SharedPlan)
            .where(SharedPlan.user_id == user_id)
            .order_by(SharedPlan.created_at.desc())
        )
    )

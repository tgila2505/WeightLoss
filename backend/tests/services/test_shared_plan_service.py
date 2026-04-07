import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.referral  # noqa: F401
import app.models.shared_plan  # noqa: F401
import app.models.user  # noqa: F401
from app.db.base import Base
from app.models.user import User


def _make_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, class_=Session)()


def _user(session: Session, email: str) -> User:
    u = User(email=email, full_name="T", hashed_password="x")
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


class TestSharedPlanService(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _make_session()
        self.alice = _user(self.session, "alice@test.com")
        self.plan_data = {"meals": ["oatmeal", "salad"], "calories": 1800}

    def test_create_shared_plan_returns_16_char_slug(self) -> None:
        from app.services.shared_plan_service import create_shared_plan

        plan = create_shared_plan(self.session, self.alice.id, self.plan_data)
        self.assertEqual(len(plan.slug), 16)
        self.assertEqual(plan.plan_data, self.plan_data)
        self.assertEqual(plan.user_id, self.alice.id)
        self.assertEqual(plan.views, 0)
        self.assertTrue(plan.is_active)

    def test_get_shared_plan_by_slug_returns_plan(self) -> None:
        from app.services.shared_plan_service import create_shared_plan, get_shared_plan_by_slug

        plan = create_shared_plan(self.session, self.alice.id, self.plan_data)
        found = get_shared_plan_by_slug(self.session, plan.slug)
        self.assertIsNotNone(found)
        self.assertEqual(found.id, plan.id)  # type: ignore[union-attr]

    def test_get_shared_plan_by_slug_returns_none_for_unknown(self) -> None:
        from app.services.shared_plan_service import get_shared_plan_by_slug

        self.assertIsNone(get_shared_plan_by_slug(self.session, "ZZZZZZZZZZZZZZZZ"))

    def test_increment_view_count(self) -> None:
        from app.services.shared_plan_service import create_shared_plan, increment_view_count

        plan = create_shared_plan(self.session, self.alice.id, self.plan_data)
        increment_view_count(self.session, plan)
        increment_view_count(self.session, plan)
        self.session.refresh(plan)
        self.assertEqual(plan.views, 2)

    def test_deactivate_plan(self) -> None:
        from app.services.shared_plan_service import create_shared_plan, deactivate_plan

        plan = create_shared_plan(self.session, self.alice.id, self.plan_data)
        deactivate_plan(self.session, plan)
        self.session.refresh(plan)
        self.assertFalse(plan.is_active)

    def test_list_user_plans_returns_only_users_plans(self) -> None:
        from app.services.shared_plan_service import create_shared_plan, list_user_plans

        bob = _user(self.session, "bob@test.com")
        create_shared_plan(self.session, self.alice.id, self.plan_data)
        create_shared_plan(self.session, self.alice.id, self.plan_data)
        create_shared_plan(self.session, bob.id, self.plan_data)

        plans = list_user_plans(self.session, self.alice.id)
        self.assertEqual(len(plans), 2)
        self.assertTrue(all(p.user_id == self.alice.id for p in plans))

    def test_expired_plan_not_returned_as_active(self) -> None:
        from app.services.shared_plan_service import create_shared_plan, get_shared_plan_by_slug

        plan = create_shared_plan(self.session, self.alice.id, self.plan_data)
        # Manually set expiry in the past
        plan.expires_at = datetime.now(UTC).replace(tzinfo=None) - timedelta(days=1)
        self.session.commit()

        found = get_shared_plan_by_slug(self.session, plan.slug)
        self.assertIsNone(found)


if __name__ == "__main__":
    unittest.main()

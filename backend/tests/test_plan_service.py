import sys
import unittest
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanPayload
from app.services.plan_service import PlanService


class PlanServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.session_factory = sessionmaker(
            bind=self.engine,
            autoflush=False,
            autocommit=False,
            class_=Session,
        )
        Base.metadata.create_all(self.engine)
        self.service = PlanService()

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_plan_clears_plan_refresh_flag(self) -> None:
        with self.session_factory() as session:
            user = User(
                email="user@example.com",
                full_name="Plan User",
                hashed_password="hashed",
                plan_refresh_needed=True,
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            response = self.service.create_plan(
                session=session,
                user=user,
                payload=self._payload(title="Weekday plan"),
            )
            session.refresh(user)

            self.assertEqual(response.title, "Weekday plan")
            self.assertFalse(user.plan_refresh_needed)

    def test_get_latest_plan_returns_newest_record(self) -> None:
        with self.session_factory() as session:
            user = User(
                email="user@example.com",
                full_name="Plan User",
                hashed_password="hashed",
            )
            session.add(user)
            session.commit()
            session.refresh(user)

            self.service.create_plan(session=session, user=user, payload=self._payload("Older"))
            latest = self.service.create_plan(
                session=session,
                user=user,
                payload=self._payload("Latest"),
            )

            response = self.service.get_latest_plan(session=session, user=user)

            self.assertIsNotNone(response)
            self.assertEqual(response.title, latest.title)

    def _payload(self, title: str) -> PlanCreate:
        return PlanCreate(
            title=title,
            status="active",
            plan=PlanPayload(
                intent="meal_plan",
                meals=[{"meal": "breakfast", "name": "Oats"}],
                activity=[{"title": "Walk", "frequency": "Daily"}],
                behavioral_actions=["Drink water"],
                recommendations=["Add protein"],
            ),
        )


if __name__ == "__main__":
    unittest.main()

import sys
import unittest
from datetime import UTC, datetime
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from tests.support import sqlite_compatible_tables

import app.models.referral  # noqa: F401
import app.models.shared_plan  # noqa: F401
import app.models.user  # noqa: F401
from app.db.base import Base
from app.models.referral import Referral, ReferralEvent, ReferralEventType, RewardLog
from app.models.user import User


def _make_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine, tables=sqlite_compatible_tables())
    return sessionmaker(bind=engine, class_=Session)()


def _user(session: Session, email: str) -> User:
    u = User(email=email, full_name="T", hashed_password="x")
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def _referral(session: Session, referrer_id: int) -> Referral:
    ref = Referral(referrer_user_id=referrer_id, code="TESTCODE")
    session.add(ref)
    session.commit()
    session.refresh(ref)
    return ref


def _signup_event(session: Session, referral: Referral, referred_id: int) -> ReferralEvent:
    ev = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.SIGNUP,
        referred_user_id=referred_id,
    )
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


class TestRewardService(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _make_session()
        self.alice = _user(self.session, "alice@r.com")
        self.bob = _user(self.session, "bob@r.com")
        self.referral = _referral(self.session, self.alice.id)

    def test_apply_signup_reward_grants_7_premium_days(self) -> None:
        from app.services.reward_service import apply_signup_reward

        before = datetime.now(UTC)
        apply_signup_reward(self.session, self.bob.id, referral_event_id=None)
        self.session.refresh(self.bob)

        self.assertIsNotNone(self.bob.premium_until)
        # premium_until should be at least 6 days from now
        delta = self.bob.premium_until.replace(tzinfo=UTC) - before
        self.assertGreaterEqual(delta.days, 6)

    def test_apply_conversion_reward_grants_7_days_to_referrer(self) -> None:
        from app.services.reward_service import apply_conversion_reward

        ev = _signup_event(self.session, self.referral, self.bob.id)
        apply_conversion_reward(self.session, self.referral, ev)
        self.session.refresh(self.alice)

        self.assertIsNotNone(self.alice.premium_until)
        now = datetime.now(UTC)
        premium = self.alice.premium_until.replace(tzinfo=UTC)
        self.assertGreater(premium, now)

    def test_apply_conversion_reward_is_idempotent(self) -> None:
        from app.services.reward_service import apply_conversion_reward

        ev = _signup_event(self.session, self.referral, self.bob.id)
        apply_conversion_reward(self.session, self.referral, ev)
        apply_conversion_reward(self.session, self.referral, ev)

        count = self.session.scalar(
            select(func.count()).select_from(RewardLog).where(
                RewardLog.referral_event_id == ev.id
            )
        )
        self.assertEqual(count, 1)

    def test_apply_conversion_reward_caps_at_20_per_month(self) -> None:
        from app.services.reward_service import apply_conversion_reward

        for i in range(21):
            u = _user(self.session, f"user{i}@r.com")
            ev = _signup_event(self.session, self.referral, u.id)
            apply_conversion_reward(self.session, self.referral, ev)

        count = self.session.scalar(
            select(func.count()).select_from(RewardLog).where(
                RewardLog.user_id == self.alice.id
            )
        )
        self.assertEqual(count, 20)


if __name__ == "__main__":
    unittest.main()

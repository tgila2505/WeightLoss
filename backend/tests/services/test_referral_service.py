import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool
from tests.support import sqlite_compatible_tables

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
    Base.metadata.create_all(engine, tables=sqlite_compatible_tables())
    factory = sessionmaker(bind=engine, class_=Session)
    return factory()


def _create_user(session: Session, email: str) -> User:
    user = User(email=email, full_name="Test", hashed_password="x")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestReferralService(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _make_session()
        self.alice = _create_user(self.session, "alice@test.com")

    def test_get_or_create_referral_creates_eight_char_code(self) -> None:
        from app.services.referral_service import get_or_create_referral

        ref = get_or_create_referral(self.session, self.alice.id)
        self.assertEqual(len(ref.code), 8)
        self.assertEqual(ref.referrer_user_id, self.alice.id)

    def test_get_or_create_referral_is_idempotent(self) -> None:
        from app.services.referral_service import get_or_create_referral

        r1 = get_or_create_referral(self.session, self.alice.id)
        r2 = get_or_create_referral(self.session, self.alice.id)
        self.assertEqual(r1.id, r2.id)
        self.assertEqual(r1.code, r2.code)

    def test_get_referral_by_code_case_insensitive(self) -> None:
        from app.services.referral_service import get_or_create_referral, get_referral_by_code

        ref = get_or_create_referral(self.session, self.alice.id)
        found = get_referral_by_code(self.session, ref.code.lower())
        self.assertIsNotNone(found)
        self.assertEqual(found.id, ref.id)  # type: ignore[union-attr]

    def test_get_referral_by_code_returns_none_for_unknown(self) -> None:
        from app.services.referral_service import get_referral_by_code

        self.assertIsNone(get_referral_by_code(self.session, "ZZZZZZZZ"))

    def test_assign_referral_records_signup_event(self) -> None:
        from app.services.referral_service import assign_referral_to_user, get_or_create_referral

        bob = _create_user(self.session, "bob@test.com")
        ref = get_or_create_referral(self.session, self.alice.id)
        event = assign_referral_to_user(self.session, ref, bob.id)
        self.assertIsNotNone(event)
        self.assertEqual(event.referred_user_id, bob.id)  # type: ignore[union-attr]

    def test_assign_referral_prevents_self_referral(self) -> None:
        from app.services.referral_service import assign_referral_to_user, get_or_create_referral

        ref = get_or_create_referral(self.session, self.alice.id)
        event = assign_referral_to_user(self.session, ref, self.alice.id)
        self.assertIsNone(event)

    def test_assign_referral_is_idempotent(self) -> None:
        from app.services.referral_service import assign_referral_to_user, get_or_create_referral

        bob = _create_user(self.session, "bob2@test.com")
        ref = get_or_create_referral(self.session, self.alice.id)
        e1 = assign_referral_to_user(self.session, ref, bob.id)
        e2 = assign_referral_to_user(self.session, ref, bob.id)
        self.assertEqual(e1.id, e2.id)  # type: ignore[union-attr]

    def test_get_referral_stats_before_referral_created(self) -> None:
        from app.services.referral_service import get_referral_stats

        stats = get_referral_stats(self.session, self.alice.id)
        self.assertIsNone(stats["code"])
        self.assertEqual(stats["clicks"], 0)

    def test_get_referral_stats_counts_correctly(self) -> None:
        from app.services.referral_service import (
            assign_referral_to_user,
            get_or_create_referral,
            get_referral_stats,
            track_referral_click,
        )

        bob = _create_user(self.session, "bob3@test.com")
        ref = get_or_create_referral(self.session, self.alice.id)
        track_referral_click(self.session, ref, "1.2.3.4")
        assign_referral_to_user(self.session, ref, bob.id)

        stats = get_referral_stats(self.session, self.alice.id)
        self.assertEqual(stats["clicks"], 1)
        self.assertEqual(stats["signups"], 1)
        self.assertEqual(stats["conversions"], 0)


if __name__ == "__main__":
    unittest.main()

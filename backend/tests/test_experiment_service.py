import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.user import User
from app.models.experiment import ExperimentAssignment  # ensure table is registered
from app.core.security import get_password_hash
from app.services.experiment_service import EXPERIMENTS, _bucket, get_or_assign_variant


class BucketingTest(unittest.TestCase):
    """Pure determinism tests — no DB needed."""

    def test_bucket_is_deterministic(self) -> None:
        v1 = _bucket(42, "pricing-variant", ["9", "12", "19"])
        v2 = _bucket(42, "pricing-variant", ["9", "12", "19"])
        self.assertEqual(v1, v2)

    def test_bucket_stays_within_variants(self) -> None:
        variants = ["9", "12", "19"]
        for user_id in range(200):
            result = _bucket(user_id, "pricing-variant", variants)
            self.assertIn(result, variants)

    def test_different_users_can_get_different_variants(self) -> None:
        variants = ["A", "B"]
        results = {_bucket(uid, "headline-copy", variants) for uid in range(100)}
        self.assertEqual(results, {"A", "B"})

    def test_known_experiment_keys_exist(self) -> None:
        for key in ["paywall-timing", "pricing-variant", "headline-copy", "cta-copy"]:
            self.assertIn(key, EXPERIMENTS)


class AssignmentPersistenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        # Only create the tables needed for these tests; other models (e.g.
        # AnalyticsEvent) use PostgreSQL-specific types (JSONB) that SQLite
        # cannot compile, so we target only the relevant tables explicitly.
        _TABLES = [
            Base.metadata.tables["users"],
            Base.metadata.tables["experiment_assignments"],
        ]
        Base.metadata.create_all(self.engine, tables=_TABLES)
        self.factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False, class_=Session)

    def tearDown(self) -> None:
        _TABLES = [
            Base.metadata.tables["users"],
            Base.metadata.tables["experiment_assignments"],
        ]
        Base.metadata.drop_all(self.engine, tables=_TABLES)
        self.engine.dispose()

    def _make_user(self) -> User:
        with self.factory() as session:
            user = User(email="u@x.com", full_name="U", hashed_password=get_password_hash("pw"))
            session.add(user)
            session.commit()
            session.refresh(user)
            session.expunge(user)
            return user

    def test_first_call_creates_assignment(self) -> None:
        user = self._make_user()
        with self.factory() as session:
            variant = get_or_assign_variant(session, user.id, "pricing-variant")
        self.assertIn(variant, EXPERIMENTS["pricing-variant"])

    def test_second_call_returns_same_variant(self) -> None:
        user = self._make_user()
        with self.factory() as s1:
            v1 = get_or_assign_variant(s1, user.id, "pricing-variant")
        with self.factory() as s2:
            v2 = get_or_assign_variant(s2, user.id, "pricing-variant")
        self.assertEqual(v1, v2)

    def test_unknown_experiment_raises(self) -> None:
        user = self._make_user()
        with self.factory() as session:
            with self.assertRaises(ValueError):
                get_or_assign_variant(session, user.id, "unknown-experiment")

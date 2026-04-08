import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from tests.support import sqlite_compatible_tables
from app.models.experiment import ExperimentAssignment
from app.models.user import User
from app.core.security import get_password_hash

# Tables needed for this test (excludes PostgreSQL-specific models like analytics_events)
_TEST_TABLES = ["users", "experiment_assignments"]


class ExperimentModelTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        tables = [
            Base.metadata.tables[t]
            for t in _TEST_TABLES
            if t in Base.metadata.tables
        ]
        Base.metadata.create_all(self.engine, tables=tables)
        self.session = Session(bind=self.engine)

    def tearDown(self) -> None:
        self.session.close()
        tables = [
            Base.metadata.tables[t]
            for t in _TEST_TABLES
            if t in Base.metadata.tables
        ]
        Base.metadata.drop_all(self.engine, tables=tables)

    def test_assignment_roundtrip(self) -> None:
        user = User(
            email="x@y.com",
            full_name="X",
            hashed_password=get_password_hash("pw"),
        )
        self.session.add(user)
        self.session.flush()

        assignment = ExperimentAssignment(
            user_id=user.id,
            experiment_key="pricing-variant",
            variant="9",
        )
        self.session.add(assignment)
        self.session.commit()
        self.session.refresh(assignment)

        loaded = self.session.get(ExperimentAssignment, assignment.id)
        self.assertEqual(loaded.experiment_key, "pricing-variant")
        self.assertEqual(loaded.variant, "9")
        self.assertEqual(loaded.user_id, user.id)
        self.assertIsNotNone(loaded.assigned_at)

    def test_unique_per_user_per_experiment(self) -> None:
        from sqlalchemy.exc import IntegrityError

        user = User(
            email="a@b.com",
            full_name="A",
            hashed_password=get_password_hash("pw"),
        )
        self.session.add(user)
        self.session.flush()

        self.session.add(ExperimentAssignment(
            user_id=user.id, experiment_key="headline-copy", variant="A"
        ))
        self.session.commit()

        self.session.add(ExperimentAssignment(
            user_id=user.id, experiment_key="headline-copy", variant="B"
        ))
        with self.assertRaises(IntegrityError):
            self.session.commit()


if __name__ == "__main__":
    unittest.main()

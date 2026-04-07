import sys
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from tests.support import sqlite_compatible_tables
from app.models.funnel import AnonymousSession, ConversionEvent, UserSubscription
from app.models.user import User
from app.core.security import get_password_hash
from app.services.funnel_service import FunnelService


_PROFILE = {
    "name": "Alex",
    "age": 30,
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 90,
    "goal_weight_kg": 75,
    "timeline_weeks": 20,
    "health_conditions": "",
    "activity_level": "moderate",
    "diet_pattern": "balanced",
}

_TABLES = [
    User.__table__,
    AnonymousSession.__table__,
    ConversionEvent.__table__,
    UserSubscription.__table__,
]


class FunnelServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.factory = sessionmaker(
            bind=self.engine, autoflush=False, autocommit=False, class_=Session
        )
        Base.metadata.create_all(self.engine, tables=_TABLES)
        self.svc = FunnelService()

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine, tables=list(reversed(_TABLES)))
        self.engine.dispose()

    def test_create_session_stores_profile_and_sets_expiry(self) -> None:
        with self.factory() as session:
            anon = self.svc.create_session(session, _PROFILE)
            self.assertIsNotNone(anon.session_token)
            self.assertEqual(anon.profile_data["name"], "Alex")
            future = anon.expires_at.replace(tzinfo=UTC)
            self.assertGreater(future, datetime.now(UTC) + timedelta(hours=71))

    def test_get_session_by_token_found(self) -> None:
        with self.factory() as session:
            anon = self.svc.create_session(session, _PROFILE)
            token = anon.session_token
        with self.factory() as session:
            loaded = self.svc.get_session_by_token(session, token)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded.session_token, token)

    def test_get_session_by_token_not_found(self) -> None:
        with self.factory() as session:
            result = self.svc.get_session_by_token(session, uuid.uuid4())
            self.assertIsNone(result)

    def test_calculate_preview_male_moderate(self) -> None:
        # Male, 30yo, 175cm, 90kg, moderate (×1.55)
        # BMR = 10*90 + 6.25*175 - 5*30 + 5 = 900 + 1093.75 - 150 + 5 = 1848.75
        # TDEE = 1848.75 * 1.55 = 2865.56 → target = 2865.56 - 500 = 2365.56 → 2366
        result = self.svc.calculate_preview(_PROFILE)
        self.assertAlmostEqual(result["calories"], 2366, delta=5)
        self.assertGreater(result["protein_g"], 0)
        self.assertGreater(result["carbs_g"], 0)
        self.assertGreater(result["fat_g"], 0)
        self.assertEqual(result["deficit_rate"], 500)
        self.assertAlmostEqual(result["weekly_loss_kg_estimate"], 0.45, delta=0.05)

    def test_calculate_preview_female(self) -> None:
        profile = {**_PROFILE, "gender": "female"}
        # BMR = 10*90 + 6.25*175 - 5*30 - 161 = 900 + 1093.75 - 150 - 161 = 1682.75
        # TDEE = 1682.75 * 1.55 = 2608.26 → target = 2608.26 - 500 = 2108.26 → 2108
        result = self.svc.calculate_preview(profile)
        self.assertAlmostEqual(result["calories"], 2108, delta=5)

    def test_calculate_preview_sedentary(self) -> None:
        profile = {**_PROFILE, "activity_level": "sedentary"}
        result = self.svc.calculate_preview(profile)
        # Should be lower calories than moderate
        moderate_result = self.svc.calculate_preview(_PROFILE)
        self.assertLess(result["calories"], moderate_result["calories"])

    def test_track_event_persists(self) -> None:
        from sqlalchemy import select

        with self.factory() as session:
            self.svc.track_event(session, "landing_viewed", None, None, {})
            session.commit()
        with self.factory() as session:
            events = session.scalars(
                select(ConversionEvent).where(ConversionEvent.event_name == "landing_viewed")
            ).all()
            self.assertEqual(len(events), 1)

    def test_get_stats_returns_seed_count(self) -> None:
        with self.factory() as session:
            stats = self.svc.get_stats(session)
            self.assertGreaterEqual(stats["plans_generated"], 14280)
            self.assertIn("conversions", stats)

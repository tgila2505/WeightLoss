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


class FunnelModelsTest(unittest.TestCase):
    _TABLES = None  # populated in setUp after imports resolve

    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        tables = [
            User.__table__,
            AnonymousSession.__table__,
            ConversionEvent.__table__,
            UserSubscription.__table__,
        ]
        Base.metadata.create_all(self.engine, tables=tables)
        self.session = Session(bind=self.engine)

    def tearDown(self) -> None:
        self.session.close()
        tables = [
            UserSubscription.__table__,
            ConversionEvent.__table__,
            AnonymousSession.__table__,
            User.__table__,
        ]
        Base.metadata.drop_all(self.engine, tables=tables)

    def test_anonymous_session_roundtrip(self) -> None:
        token = uuid.uuid4()
        anon = AnonymousSession(
            session_token=token,
            profile_data={"name": "Alex", "age": 30},
            expires_at=datetime.now(UTC) + timedelta(hours=72),
        )
        self.session.add(anon)
        self.session.commit()
        self.session.refresh(anon)

        loaded = self.session.get(AnonymousSession, anon.id)
        self.assertEqual(loaded.session_token, token)
        self.assertEqual(loaded.profile_data["name"], "Alex")

    def test_user_subscription_roundtrip(self) -> None:
        user = User(email="a@b.com", full_name="A", hashed_password=get_password_hash("pw"))
        self.session.add(user)
        self.session.flush()

        sub = UserSubscription(
            user_id=user.id,
            stripe_customer_id="cus_test",
            stripe_subscription_id="sub_test",
            tier="free",
            status="active",
        )
        self.session.add(sub)
        self.session.commit()
        self.session.refresh(sub)

        loaded = self.session.get(UserSubscription, sub.id)
        self.assertEqual(loaded.tier, "free")
        self.assertEqual(loaded.stripe_customer_id, "cus_test")

    def test_conversion_event_nullable_fks(self) -> None:
        event = ConversionEvent(event_name="landing_viewed", properties={})
        self.session.add(event)
        self.session.commit()
        loaded = self.session.get(ConversionEvent, event.id)
        self.assertIsNone(loaded.session_token)
        self.assertIsNone(loaded.user_id)

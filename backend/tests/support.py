import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.main import create_app
from app.models.funnel import UserSubscription
from app.models.user import User

# Import all models so their tables are registered in Base.metadata
import app.models.adherence  # noqa: F401
import app.models.analytics  # noqa: F401
import app.models.behavior_tracking  # noqa: F401
import app.models.experiment  # noqa: F401
import app.models.feedback  # noqa: F401
import app.models.health_metrics  # noqa: F401
import app.models.lab  # noqa: F401
import app.models.onboarding  # noqa: F401
import app.models.plan  # noqa: F401
import app.models.profile  # noqa: F401
import app.models.questionnaire  # noqa: F401
import app.models.refresh_token  # noqa: F401
import app.models.reminder  # noqa: F401


def sqlite_compatible_tables() -> list:
    """Return tables from Base.metadata that can be created in SQLite.

    Tables with PostgreSQL-specific column types (e.g. JSONB) are excluded
    because SQLite cannot compile them.
    """
    compatible = []
    for table in Base.metadata.sorted_tables:
        skip = False
        for col in table.columns:
            if isinstance(col.type, JSONB):
                skip = True
                break
        if not skip:
            compatible.append(table)
    return compatible


class ApiTestCase(unittest.TestCase):
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
        Base.metadata.create_all(self.engine, tables=sqlite_compatible_tables())

        self.app = create_app()

        def override_db_session():
            session = self.session_factory()
            try:
                yield session
            finally:
                session.close()

        self.app.dependency_overrides[get_db_session] = override_db_session
        self.client = TestClient(self.app)

    def tearDown(self) -> None:
        self.client.close()
        self.app.dependency_overrides.clear()
        Base.metadata.drop_all(self.engine, tables=sqlite_compatible_tables())
        self.engine.dispose()

    def create_user(
        self,
        email: str = "person@example.com",
        password: str = "password123",
        full_name: str = "Test User",
    ) -> User:
        with self.session_factory() as session:
            user = User(
                email=email,
                full_name=full_name,
                hashed_password=get_password_hash(password),
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            session.expunge(user)
            return user

    def auth_headers_for_user(self, user: User) -> dict[str, str]:
        token = create_access_token(str(user.id))
        return {"Authorization": f"Bearer {token}"}

    def create_pro_subscription(self, user: User, tier: str = 'pro') -> None:
        with self.session_factory() as session:
            sub = UserSubscription(
                user_id=user.id,
                stripe_customer_id='cus_test',
                stripe_subscription_id='sub_test',
                tier=tier,
                status='active',
            )
            session.add(sub)
            session.commit()

    def force_current_user(self, user: User) -> None:
        self.app.dependency_overrides[get_current_user] = lambda: user

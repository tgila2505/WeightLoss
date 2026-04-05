import sys
import unittest
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import create_access_token, get_password_hash
from app.db.base import Base
from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.main import create_app
from app.models.user import User


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
        Base.metadata.create_all(self.engine)

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
        Base.metadata.drop_all(self.engine)
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

    def force_current_user(self, user: User) -> None:
        self.app.dependency_overrides[get_current_user] = lambda: user

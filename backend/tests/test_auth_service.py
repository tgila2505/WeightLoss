import sys
import unittest
from pathlib import Path

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.db.base import Base
from app.models.user import User
from app.services.auth_service import AuthService


class AuthServiceTest(unittest.TestCase):
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
        self.service = AuthService()

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_user_persists_hashed_password(self) -> None:
        with self.session_factory() as session:
            user = self.service.create_user(
                session=session,
                email="user@example.com",
                password="password123",
            )

            self.assertEqual(user.email, "user@example.com")
            self.assertNotEqual(user.hashed_password, "password123")

    def test_create_user_rejects_duplicate_email(self) -> None:
        with self.session_factory() as session:
            session.add(
                User(
                    email="user@example.com",
                    full_name="Existing User",
                    hashed_password="hashed",
                )
            )
            session.commit()

            with self.assertRaises(HTTPException) as context:
                self.service.create_user(
                    session=session,
                    email="user@example.com",
                    password="password123",
                )

        self.assertEqual(context.exception.status_code, 400)

    def test_authenticate_user_returns_none_for_wrong_password(self) -> None:
        with self.session_factory() as session:
            self.service.create_user(
                session=session,
                email="user@example.com",
                password="password123",
            )

            user = self.service.authenticate_user(
                session=session,
                email="user@example.com",
                password="wrong-password",
            )

            self.assertIsNone(user)


if __name__ == "__main__":
    unittest.main()

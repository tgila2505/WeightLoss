from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.user import User


class AuthService:
    def create_user(
        self,
        session: Session,
        email: str,
        password: str,
    ) -> User:
        existing_user = session.scalar(select(User).where(User.email == email))
        if existing_user is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A user with this email already exists",
            )

        user = User(
            email=email,
            full_name="",
            hashed_password=get_password_hash(password),
        )
        session.add(user)
        session.commit()
        session.refresh(user)
        return user

    def authenticate_user(
        self,
        session: Session,
        email: str,
        password: str,
    ) -> User | None:
        statement = select(User).where(User.email == email)
        user = session.scalar(statement)
        if user is None:
            return None

        if not verify_password(password, user.hashed_password):
            return None

        return user

    def create_token_for_user(self, user: User) -> str:
        return create_access_token(subject=str(user.id))

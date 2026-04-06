from datetime import UTC, datetime, timedelta

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    hash_refresh_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
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

    def create_refresh_token_for_user(self, session: Session, user: User) -> str:
        settings = get_settings()
        raw, token_hash = create_refresh_token()
        expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
        record = RefreshToken(
            token_hash=token_hash,
            user_id=user.id,
            expires_at=expires_at,
        )
        session.add(record)
        session.commit()
        return raw

    def rotate_refresh_token(
        self,
        session: Session,
        raw_token: str,
    ) -> tuple[User, str, str] | None:
        """Validate, revoke the old refresh token, and issue a new token pair.

        Returns (user, new_access_token, new_refresh_token) or None if invalid.
        """
        token_hash = hash_refresh_token(raw_token)
        record = session.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        if record is None or record.revoked:
            return None
        if record.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
            return None

        user = session.scalar(select(User).where(User.id == record.user_id))
        if user is None:
            return None

        record.revoked = True
        session.flush()

        new_access = create_access_token(subject=str(user.id))
        new_raw, new_hash = create_refresh_token()
        settings = get_settings()
        new_record = RefreshToken(
            token_hash=new_hash,
            user_id=user.id,
            expires_at=datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days),
        )
        session.add(new_record)
        session.commit()
        return user, new_access, new_raw

    def revoke_refresh_token(self, session: Session, raw_token: str) -> None:
        token_hash = hash_refresh_token(raw_token)
        record = session.scalar(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        if record is not None and not record.revoked:
            record.revoked = True
            session.commit()

    def revoke_all_refresh_tokens_for_user(self, session: Session, user_id: int) -> None:
        records = session.scalars(
            select(RefreshToken).where(
                RefreshToken.user_id == user_id,
                RefreshToken.revoked == False,  # noqa: E712
            )
        ).all()
        for record in records:
            record.revoked = True
        session.commit()

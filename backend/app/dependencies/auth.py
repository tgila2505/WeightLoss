from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.core.token_blacklist import get_token_blacklist
from app.db.session import get_db_session
from app.models.user import User

http_bearer = HTTPBearer(auto_error=False)

ACCESS_TOKEN_COOKIE = "access_token"


def _extract_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
) -> str | None:
    """Return access token from httpOnly cookie (preferred) or Authorization header."""
    token = request.cookies.get(ACCESS_TOKEN_COOKIE)
    if token:
        return token
    if credentials:
        return credentials.credentials
    return None


def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    session: Session = Depends(get_db_session),
) -> User:
    token = _extract_token(request, credentials)
    if token is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication credentials were not provided",
        )

    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
        jti = payload.get("jti", "")
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        ) from None

    if jti and get_token_blacklist().is_revoked(jti):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has been revoked",
        )

    user = session.scalar(select(User).where(User.id == user_id))
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
        )

    return user


def get_current_user_optional(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
    session: Session = Depends(get_db_session),
) -> User | None:
    """Like get_current_user but returns None instead of raising 401."""
    token = _extract_token(request, credentials)
    if token is None:
        return None
    try:
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
        jti = payload.get("jti", "")
    except (ValueError, TypeError):
        return None

    if jti and get_token_blacklist().is_revoked(jti):
        return None

    return session.scalar(select(User).where(User.id == user_id))


def get_admin_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """Dependency that requires the current user to have is_admin=True."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user

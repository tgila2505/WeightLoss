from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from app.core.brute_force import get_brute_force_guard
from app.core.rate_limiter import rate_limit
from app.core.security import decode_access_token
from app.core.token_blacklist import get_token_blacklist
from app.db.session import get_db_session
from app.dependencies.auth import get_current_user, http_bearer
from app.models.user import User
from app.schemas.auth import (
    AuthenticatedUserResponse,
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.services.admin_service import admin_service
from app.services.auth_service import AuthService
from app.services.referral_service import assign_referral_to_user, get_referral_by_code
from app.services.reward_service import apply_signup_reward

router = APIRouter(prefix="/auth")

_auth_service = AuthService()


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(rate_limit(limit=10, window_seconds=60))],
)
def register(
    payload: RegisterRequest,
    session: Session = Depends(get_db_session),
) -> RegisterResponse:
    user = _auth_service.create_user(
        session=session,
        email=payload.email,
        password=payload.password,
    )

    referral_event_id: int | None = None
    if payload.ref_code:
        referral = get_referral_by_code(session, payload.ref_code)
        if referral:
            event = assign_referral_to_user(session, referral, user.id)
            if event:
                referral_event_id = event.id

    apply_signup_reward(session, user.id, referral_event_id)

    return RegisterResponse(id=user.id, email=user.email)


@router.post(
    "/login",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(limit=10, window_seconds=60))],
)
def login(
    payload: LoginRequest,
    request: Request,
    session: Session = Depends(get_db_session),
) -> TokenResponse:
    ip = request.client.host if request.client else "unknown"
    guard = get_brute_force_guard()

    if guard.is_blocked(ip, payload.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many failed attempts. Please try again later.",
        )

    user = _auth_service.authenticate_user(
        session=session,
        email=payload.email,
        password=payload.password,
    )
    if user is None:
        guard.record_failure(ip, payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    guard.record_success(ip, payload.email)
    # Auto-promote to admin if email matches the ADMIN_EMAIL config
    admin_service.maybe_promote_admin(session, user)
    access_token = _auth_service.create_token_for_user(user)
    refresh_token = _auth_service.create_refresh_token_for_user(session, user)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    dependencies=[Depends(rate_limit(limit=20, window_seconds=60))],
)
def refresh(
    payload: RefreshTokenRequest,
    session: Session = Depends(get_db_session),
) -> TokenResponse:
    result = _auth_service.rotate_refresh_token(session, payload.refresh_token)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    _, new_access, new_refresh = result
    return TokenResponse(access_token=new_access, refresh_token=new_refresh)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(
    payload: RefreshTokenRequest,
    session: Session = Depends(get_db_session),
    credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
) -> Response:
    _auth_service.revoke_refresh_token(session, payload.refresh_token)

    if credentials is not None:
        try:
            token_data = decode_access_token(credentials.credentials)
            jti = token_data.get("jti", "")
            exp = token_data.get("exp", 0.0)
            if jti and exp:
                get_token_blacklist().revoke(jti, exp)
        except ValueError:
            pass

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/me", response_model=AuthenticatedUserResponse)
def read_current_user(
    current_user: User = Depends(get_current_user),
) -> AuthenticatedUserResponse:
    return AuthenticatedUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
        is_admin=current_user.is_admin,
    )

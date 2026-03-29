from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.auth import (
    AuthenticatedUserResponse,
    LoginRequest,
    RegisterRequest,
    RegisterResponse,
    TokenResponse,
)
from app.services.auth_service import AuthService

router = APIRouter(prefix="/auth")


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    session: Session = Depends(get_db_session),
) -> RegisterResponse:
    auth_service = AuthService()
    user = auth_service.create_user(
        session=session,
        email=payload.email,
        password=payload.password,
    )
    return RegisterResponse(id=user.id, email=user.email)


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    session: Session = Depends(get_db_session),
) -> TokenResponse:
    auth_service = AuthService()
    user = auth_service.authenticate_user(
        session=session,
        email=payload.email,
        password=payload.password,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    return TokenResponse(access_token=auth_service.create_token_for_user(user))


@router.get("/me", response_model=AuthenticatedUserResponse)
def read_current_user(
    current_user: User = Depends(get_current_user),
) -> AuthenticatedUserResponse:
    return AuthenticatedUserResponse(
        id=current_user.id,
        email=current_user.email,
        full_name=current_user.full_name,
    )

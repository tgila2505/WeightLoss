import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash
from app.db.session import get_db_session
from app.models.funnel import AnonymousSession, UserSubscription
from app.models.user import User
from app.schemas.funnel import (
    ConvertRequest,
    ConvertResponse,
    CreateSessionRequest,
    FunnelStatsResponse,
    PreviewResponse,
    SessionCreatedResponse,
    StripeWebhookResponse,
    TrackEventRequest,
)
from app.services.funnel_service import FunnelService
from app.services.stripe_service import StripeService

router = APIRouter(prefix="/funnel")

_funnel_service = FunnelService()
_COOKIE_NAME = "funnel_session"
_COOKIE_MAX_AGE = 72 * 3600


def _get_stripe_service() -> StripeService:
    settings = get_settings()
    return StripeService(
        secret_key=settings.stripe_secret_key,
        pro_monthly_price_id=settings.stripe_pro_monthly_price_id,
        pro_annual_price_id=settings.stripe_pro_annual_price_id,
        pro_plus_monthly_price_id=settings.stripe_pro_plus_monthly_price_id,
        pro_plus_annual_price_id=settings.stripe_pro_plus_annual_price_id,
    )


# ── POST /funnel/session ───────────────────────────────────────────────────

@router.post(
    "/session",
    response_model=SessionCreatedResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_session(
    payload: CreateSessionRequest,
    response: Response,
    session: Session = Depends(get_db_session),
) -> SessionCreatedResponse:
    profile_data = payload.model_dump()
    anon = _funnel_service.create_session(session, profile_data)
    token_str = str(anon.session_token)
    response.set_cookie(
        key=_COOKIE_NAME,
        value=token_str,
        max_age=_COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
    )
    return SessionCreatedResponse(session_id=token_str)


# ── GET /funnel/preview ────────────────────────────────────────────────────

@router.get("/preview", response_model=PreviewResponse)
def get_preview(
    funnel_session: str | None = Cookie(default=None),
    session: Session = Depends(get_db_session),
) -> PreviewResponse:
    if funnel_session is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No funnel session cookie found",
        )
    try:
        token = uuid.UUID(funnel_session)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid session token",
        )

    anon = _funnel_service.get_session_by_token(session, token)
    if anon is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found or expired",
        )
    if anon.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired",
        )

    preview = _funnel_service.calculate_preview(anon.profile_data)
    return PreviewResponse(**preview)


# ── POST /funnel/convert ───────────────────────────────────────────────────

@router.post("/convert", response_model=ConvertResponse)
def convert(
    payload: ConvertRequest,
    response: Response,
    funnel_session: str | None = Cookie(default=None),
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> ConvertResponse:
    # Resolve funnel session (optional — conversion can happen without it)
    session_token: uuid.UUID | None = None
    if funnel_session is not None:
        try:
            session_token = uuid.UUID(funnel_session)
        except ValueError:
            session_token = None

    # Prevent duplicate accounts
    existing = session.scalar(select(User).where(User.email == payload.email))
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists",
        )

    # Create Stripe subscription
    try:
        customer_id, subscription_id, price_id = stripe_svc.create_subscription(
            email=payload.email,
            payment_method_id=payload.payment_method_id,
            tier=payload.tier,
            interval=payload.interval,
            trial_period_days=7,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=str(exc),
        ) from exc

    # Create user
    user = User(
        email=payload.email,
        full_name="",
        hashed_password=get_password_hash(payload.password),
    )
    session.add(user)
    session.flush()  # get user.id

    # Create subscription record (7-day trial)
    now = datetime.now(UTC)
    sub = UserSubscription(
        user_id=user.id,
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        tier=payload.tier,
        interval=payload.interval,
        stripe_price_id=price_id,
        status="trialing",
        trial_started_at=now,
        trial_expires_at=now + timedelta(days=7),
    )
    session.add(sub)

    # Track conversion event (fire-and-forget)
    _funnel_service.track_event(
        session,
        "conversion_completed",
        session_token,
        None,  # user_id not available until commit
        {"email": payload.email},
    )

    session.commit()

    # Clear the funnel session cookie
    response.delete_cookie(_COOKIE_NAME)

    access_token = create_access_token(subject=str(user.id))
    return ConvertResponse(access_token=access_token)


# ── POST /funnel/events ────────────────────────────────────────────────────

@router.post("/events", status_code=status.HTTP_204_NO_CONTENT)
def track_event(
    payload: TrackEventRequest,
    session: Session = Depends(get_db_session),
) -> None:
    _funnel_service.track_event(
        session,
        payload.event_name,
        payload.session_token,
        None,
        payload.properties,
    )
    session.commit()


# ── GET /funnel/stats ──────────────────────────────────────────────────────

@router.get("/stats", response_model=FunnelStatsResponse)
def get_stats(
    session: Session = Depends(get_db_session),
) -> FunnelStatsResponse:
    data = _funnel_service.get_stats(session)
    return FunnelStatsResponse(**data)


# ── POST /funnel/webhook/stripe ────────────────────────────────────────────

@router.post("/webhook/stripe", response_model=StripeWebhookResponse)
async def stripe_webhook(
    request: Request,
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> StripeWebhookResponse:
    settings = get_settings()
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    try:
        event = stripe_svc.validate_webhook(payload, sig_header, settings.stripe_webhook_secret)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    event_type: str = event.get("type", "")
    data_obj = event.get("data", {}).get("object", {})

    if event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        stripe_sub_id: str = data_obj.get("id", "")
        new_status: str = data_obj.get("status", "")
        sub = session.scalar(
            select(UserSubscription).where(
                UserSubscription.stripe_subscription_id == stripe_sub_id
            )
        )
        if sub is not None:
            sub.status = new_status
            if event_type == "customer.subscription.deleted":
                sub.tier = "free"
            session.commit()

    return StripeWebhookResponse(received=True)

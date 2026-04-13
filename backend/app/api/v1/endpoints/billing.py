import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.dependencies.billing import TIER_CAPABILITIES, SubscriptionAccess, get_subscription
from app.models.billing import BillingEvent, PricingPlan
from app.models.funnel import UserSubscription
from app.models.user import User
from app.schemas.billing import (
    BillingPortalResponse,
    BillingStatusResponse,
    CancelResponse,
    CapabilityMap,
    PaymentMethodRequest,
    PlansResponse,
    PricingPlanItem,
    SubscribeRequest,
    SubscribeResponse,
    UsageItem,
    UsageResponse,
    WebhookResponse,
)
from app.services.stripe_service import StripeService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/billing")


def _get_stripe_service() -> StripeService:
    s = get_settings()
    return StripeService(
        secret_key=s.stripe_secret_key,
        pro_monthly_price_id=s.stripe_pro_monthly_price_id,
        pro_annual_price_id=s.stripe_pro_annual_price_id,
        pro_plus_monthly_price_id=s.stripe_pro_plus_monthly_price_id,
        pro_plus_annual_price_id=s.stripe_pro_plus_annual_price_id,
    )


# ── GET /billing/plans ─────────────────────────────────────────────────────

@router.get("/plans", response_model=PlansResponse)
def get_plans(session: Session = Depends(get_db_session)) -> PlansResponse:
    rows = session.scalars(select(PricingPlan).where(PricingPlan.active == True)).all()  # noqa: E712
    plans = [
        PricingPlanItem(
            tier=r.tier,
            interval=r.interval if r.interval != "monthly" or r.tier != "free" else None,
            price_cents=r.price_cents,
            display_name=r.display_name,
        )
        for r in rows
    ]
    return PlansResponse(plans=plans)


# ── GET /billing/status ────────────────────────────────────────────────────

@router.get("/status", response_model=BillingStatusResponse)
def get_billing_status(access: SubscriptionAccess = Depends(get_subscription)) -> BillingStatusResponse:
    effective_tier = access.tier
    if access.trial_active and effective_tier == "free":
        effective_tier = "pro"
    caps = TIER_CAPABILITIES.get(effective_tier, TIER_CAPABILITIES["free"])
    return BillingStatusResponse(
        tier=access.tier,
        interval=access.interval,
        status=access.status,
        trial_active=access.trial_active,
        past_due=access.past_due,
        cancel_at_period_end=access.cancel_at_period_end,
        current_period_end=access.current_period_end,
        capabilities=CapabilityMap(**caps),
    )


# ── GET /billing/usage ─────────────────────────────────────────────────────

@router.get("/usage", response_model=UsageResponse)
def get_usage(
    access: SubscriptionAccess = Depends(get_subscription),
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> UsageResponse:
    from sqlalchemy import select as sa_select

    from app.models.billing import UsageTracking
    from app.services.usage_tracker import USAGE_LIMITS, get_period_key

    tier = access.tier
    if access.trial_active and tier == "free":
        tier = "pro"

    feature_limits = USAGE_LIMITS.get(tier, {})
    items: list[UsageItem] = []
    for feature, limits in feature_limits.items():
        period_key = get_period_key(feature)
        row = session.scalar(
            sa_select(UsageTracking).where(
                UsageTracking.user_id == user.id,
                UsageTracking.feature == feature,
                UsageTracking.period_key == period_key,
            )
        )
        items.append(UsageItem(
            feature=feature,
            period_key=period_key,
            count=row.count if row else 0,
            soft_limit=limits.get("soft"),
            hard_cap=limits.get("hard"),
        ))
    return UsageResponse(usage=items)


# ── POST /billing/subscribe ────────────────────────────────────────────────

@router.post("/subscribe", response_model=SubscribeResponse)
def subscribe(
    payload: SubscribeRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> SubscribeResponse:
    sub = session.scalar(select(UserSubscription).where(UserSubscription.user_id == user.id))

    if sub and sub.stripe_customer_id:
        # Existing customer — attach new payment method + create subscription
        try:
            if sub.stripe_subscription_id:
                price_id = stripe_svc.update_subscription_price(
                    sub.stripe_subscription_id, payload.tier, payload.interval
                )
                new_sub_id = sub.stripe_subscription_id
            else:
                new_sub_id, price_id = stripe_svc.create_subscription_for_customer(
                    sub.stripe_customer_id, payload.payment_method_id, payload.tier, payload.interval
                )
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(exc)) from exc

        sub.tier = payload.tier
        sub.interval = payload.interval
        sub.status = "active"
        sub.stripe_subscription_id = new_sub_id
        sub.stripe_price_id = price_id
    else:
        # New customer
        try:
            customer_id, subscription_id, price_id = stripe_svc.create_subscription(
                email=user.email,
                payment_method_id=payload.payment_method_id,
                tier=payload.tier,
                interval=payload.interval,
                trial_period_days=0,
            )
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(exc)) from exc

        if sub:
            sub.stripe_customer_id = customer_id
            sub.stripe_subscription_id = subscription_id
            sub.tier = payload.tier
            sub.interval = payload.interval
            sub.status = "active"
            sub.stripe_price_id = price_id
        else:
            sub = UserSubscription(
                user_id=user.id,
                stripe_customer_id=customer_id,
                stripe_subscription_id=subscription_id,
                tier=payload.tier,
                interval=payload.interval,
                status="active",
                stripe_price_id=price_id,
            )
            session.add(sub)

    session.commit()
    session.refresh(sub)
    return SubscribeResponse(
        subscription_id=sub.stripe_subscription_id,
        tier=sub.tier,
        status=sub.status,
        current_period_end=sub.current_period_end,
    )


# ── POST /billing/cancel ───────────────────────────────────────────────────

@router.post("/cancel", response_model=CancelResponse)
def cancel_subscription(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> CancelResponse:
    sub = session.scalar(select(UserSubscription).where(UserSubscription.user_id == user.id))
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No active subscription")
    try:
        stripe_svc.cancel_subscription(sub.stripe_subscription_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    sub.cancel_at_period_end = True
    sub.cancelled_at = datetime.now(UTC)
    session.commit()
    session.refresh(sub)
    return CancelResponse(
        cancel_at_period_end=sub.cancel_at_period_end,
        current_period_end=sub.current_period_end,
    )


# ── POST /billing/reactivate ───────────────────────────────────────────────

@router.post("/reactivate")
def reactivate_subscription(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> dict:
    sub = session.scalar(select(UserSubscription).where(UserSubscription.user_id == user.id))
    if not sub or not sub.stripe_subscription_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No subscription found")
    try:
        stripe_svc.reactivate_subscription(sub.stripe_subscription_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    sub.cancel_at_period_end = False
    sub.cancelled_at = None
    session.commit()
    return {"reactivated": True}


# ── PUT /billing/payment-method ────────────────────────────────────────────

@router.put("/payment-method")
def update_payment_method(
    payload: PaymentMethodRequest,
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> dict:
    sub = session.scalar(select(UserSubscription).where(UserSubscription.user_id == user.id))
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No customer found")
    try:
        stripe_svc.update_payment_method(sub.stripe_customer_id, payload.payment_method_id)
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return {"updated": True}


# ── POST /billing/portal ───────────────────────────────────────────────────

@router.post("/portal", response_model=BillingPortalResponse)
def billing_portal(
    user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> BillingPortalResponse:
    sub = session.scalar(select(UserSubscription).where(UserSubscription.user_id == user.id))
    if not sub or not sub.stripe_customer_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No customer found")
    try:
        url = stripe_svc.create_billing_portal_session(
            sub.stripe_customer_id,
            return_url="http://localhost:3000/settings/billing",
        )
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    return BillingPortalResponse(url=url)


# ── POST /billing/stripe-webhook ───────────────────────────────────────────

@router.post("/stripe-webhook", response_model=WebhookResponse)
async def stripe_webhook(
    request: Request,
    stripe_signature: str | None = Header(default=None, alias="stripe-signature"),
    session: Session = Depends(get_db_session),
    stripe_svc: StripeService = Depends(_get_stripe_service),
) -> WebhookResponse:
    settings = get_settings()
    if stripe_signature is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing stripe-signature")

    body = await request.body()
    try:
        event = stripe_svc.validate_webhook(body, stripe_signature, settings.stripe_webhook_secret)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook signature")

    event_id = event.get("id", "")
    event_type = event.get("type", "")

    # Idempotency check
    existing = session.scalar(select(BillingEvent).where(BillingEvent.stripe_event_id == event_id))
    if existing:
        return WebhookResponse(received=True)

    # Route to handler
    try:
        _handle_webhook_event(event, session)
    except Exception:
        logger.exception("Webhook handler error for event %s", event_id)

    # Record event
    data_obj = event.get("data", {}).get("object", {})
    user_id = _resolve_user_id(data_obj, session)
    billing_event = BillingEvent(
        user_id=user_id,
        stripe_event_id=event_id,
        event_type=event_type,
        payload=dict(event),
    )
    session.add(billing_event)
    session.commit()

    return WebhookResponse(received=True)


def _resolve_user_id(data_obj: dict, session: Session) -> int | None:
    customer_id = data_obj.get("customer")
    if not customer_id:
        return None
    sub = session.scalar(select(UserSubscription).where(UserSubscription.stripe_customer_id == customer_id))
    return sub.user_id if sub else None


def _handle_webhook_event(event: dict, session: Session) -> None:
    event_type = event.get("type", "")
    data_obj = event.get("data", {}).get("object", {})
    customer_id = data_obj.get("customer")

    sub = None
    if customer_id:
        sub = session.scalar(select(UserSubscription).where(UserSubscription.stripe_customer_id == customer_id))

    if event_type == "customer.subscription.created":
        _handle_subscription_created(data_obj, sub, session)
    elif event_type == "customer.subscription.updated":
        _handle_subscription_updated(data_obj, sub, session)
    elif event_type == "customer.subscription.deleted":
        _handle_subscription_deleted(data_obj, sub, session)
    elif event_type == "invoice.paid":
        _handle_invoice_paid(data_obj, sub, session)
    elif event_type == "invoice.payment_failed":
        _handle_invoice_payment_failed(data_obj, sub, session)


def _parse_period_end(data_obj: dict) -> datetime | None:
    ts = data_obj.get("current_period_end")
    if ts:
        return datetime.fromtimestamp(ts, tz=UTC)
    return None


def _handle_subscription_created(data_obj: dict, sub: UserSubscription | None, session: Session) -> None:
    if not sub:
        return
    sub.status = "active"
    sub.current_period_end = _parse_period_end(data_obj)
    sub.stripe_subscription_id = data_obj.get("id", sub.stripe_subscription_id)
    session.flush()


def _handle_subscription_updated(data_obj: dict, sub: UserSubscription | None, session: Session) -> None:
    if not sub:
        return
    stripe_status = data_obj.get("status", "")
    status_map = {"active": "active", "past_due": "past_due", "canceled": "cancelled", "trialing": "trialing"}
    sub.status = status_map.get(stripe_status, sub.status)
    sub.current_period_end = _parse_period_end(data_obj)
    sub.cancel_at_period_end = data_obj.get("cancel_at_period_end", False)
    session.flush()


def _handle_subscription_deleted(data_obj: dict, sub: UserSubscription | None, session: Session) -> None:
    if not sub:
        return
    sub.status = "cancelled"
    sub.cancelled_at = datetime.now(UTC)
    session.flush()


def _handle_invoice_paid(data_obj: dict, sub: UserSubscription | None, session: Session) -> None:
    if not sub:
        return
    sub.status = "active"
    session.flush()


def _handle_invoice_payment_failed(data_obj: dict, sub: UserSubscription | None, session: Session) -> None:
    if not sub:
        return
    sub.status = "past_due"
    session.flush()


# ── POST /billing/generate-reports ─────────────────────────────────────────

@router.post("/generate-reports")
def generate_reports(
    x_cron_secret: str | None = Header(default=None, alias="x-cron-secret"),
    session: Session = Depends(get_db_session),
) -> dict:
    settings = get_settings()
    if not settings.cron_secret or x_cron_secret != settings.cron_secret:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid cron secret")

    from app.services.coaching_service import trigger_weekly_reports
    triggered = trigger_weekly_reports(session)
    return {"triggered": triggered}

# Revenue Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a `/funnel/*` acquisition funnel that converts anonymous visitors into paying Pro subscribers via a 3-step onboarding, calorie preview, and Stripe checkout.

**Architecture:** Isolated `/funnel/*` route tree (no changes to existing authenticated flows). Backend adds three new tables (`anonymous_sessions`, `conversion_events`, `user_subscriptions`), six new endpoints under `/api/v1/funnel/`, and a subscription access guard on `/plans/today`. Frontend adds five funnel pages plus shared components, session-based A/B testing, and Stripe Elements checkout.

**Tech Stack:** FastAPI + SQLAlchemy + Alembic (backend), Next.js App Router + shadcn/ui + Stripe Elements (frontend), `stripe` Python package, `@stripe/stripe-js` + `@stripe/react-stripe-js` (frontend).

---

## File Map

**New backend files:**
- `backend/app/models/funnel.py` — ORM models: `AnonymousSession`, `ConversionEvent`, `UserSubscription`
- `backend/app/schemas/funnel.py` — Pydantic request/response schemas
- `backend/app/services/funnel_service.py` — session CRUD, preview calc, stats cache, conversion logic
- `backend/app/services/stripe_service.py` — Stripe customer + subscription management
- `backend/app/api/v1/endpoints/funnel.py` — all `/funnel/*` endpoints
- `backend/alembic/versions/a1b2c3d4e5f6_add_funnel_tables.py` — migration

**Modified backend files:**
- `backend/app/models/__init__.py` — add new model exports
- `backend/app/api/v1/router.py` — register funnel router
- `backend/app/core/config.py` — add Stripe env vars to Settings
- `backend/app/api/v1/endpoints/plans.py` — add subscription guard

**New frontend files:**
- `frontend/lib/funnel-session.ts` — sessionStorage profile cache + funnel API helpers
- `frontend/lib/stripe-client.ts` — loadStripe singleton
- `frontend/app/funnel/layout.tsx` — suppress NavBarWrapper for funnel pages
- `frontend/app/funnel/page.tsx` — landing page
- `frontend/app/funnel/components/funnel-hero.tsx` — A/B-tested headline + CTA
- `frontend/app/funnel/components/how-it-works.tsx`
- `frontend/app/funnel/components/cost-anchor.tsx`
- `frontend/app/funnel/components/social-proof/testimonial-card.tsx`
- `frontend/app/funnel/components/social-proof/transformation-card.tsx`
- `frontend/app/funnel/components/social-proof/plan-counter.tsx`
- `frontend/app/funnel/start/page.tsx` — anonymous onboarding
- `frontend/app/funnel/start/components/funnel-onboarding.tsx` — 3-step form
- `frontend/app/funnel/preview/page.tsx`
- `frontend/app/funnel/preview/components/plan-preview-card.tsx`
- `frontend/app/funnel/preview/components/locked-plan-preview.tsx`
- `frontend/app/funnel/preview/components/countdown-timer.tsx`
- `frontend/app/funnel/upgrade/page.tsx`
- `frontend/app/funnel/upgrade/components/upgrade-form.tsx`
- `frontend/app/funnel/upgrade/components/value-recap.tsx`
- `frontend/app/funnel/welcome/page.tsx`

**Modified frontend files:**
- `frontend/lib/analytics.ts` — extend `AnalyticsEventName` union + add `trackFunnelEvent()`
- `frontend/lib/feature-flags.ts` — add funnel A/B flags
- `frontend/app/page.tsx` — add redirect: unauthenticated → `/funnel`

---

### Task 1: DB Models

**Files:**
- Create: `backend/app/models/funnel.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_funnel_models.py
import sys
import unittest
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.funnel import AnonymousSession, ConversionEvent, UserSubscription
from app.models.user import User
from app.core.security import get_password_hash


class FunnelModelsTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.session = Session(bind=self.engine)

    def tearDown(self) -> None:
        self.session.close()
        Base.metadata.drop_all(self.engine)

    def test_anonymous_session_roundtrip(self) -> None:
        token = uuid.uuid4()
        anon = AnonymousSession(
            session_token=token,
            profile_data={"name": "Alex", "age": 30},
        )
        self.session.add(anon)
        self.session.commit()
        self.session.refresh(anon)

        loaded = self.session.get(AnonymousSession, anon.id)
        self.assertEqual(loaded.session_token, token)
        self.assertEqual(loaded.profile_data["name"], "Alex")

    def test_user_subscription_roundtrip(self) -> None:
        user = User(email="a@b.com", full_name="A", hashed_password=get_password_hash("pw"))
        self.session.add(user)
        self.session.flush()

        sub = UserSubscription(
            user_id=user.id,
            stripe_customer_id="cus_test",
            stripe_subscription_id="sub_test",
            tier="free",
            status="active",
        )
        self.session.add(sub)
        self.session.commit()
        self.session.refresh(sub)

        loaded = self.session.get(UserSubscription, sub.id)
        self.assertEqual(loaded.tier, "free")
        self.assertEqual(loaded.stripe_customer_id, "cus_test")

    def test_conversion_event_nullable_fks(self) -> None:
        event = ConversionEvent(event_name="landing_viewed", properties={})
        self.session.add(event)
        self.session.commit()
        loaded = self.session.get(ConversionEvent, event.id)
        self.assertIsNone(loaded.session_token)
        self.assertIsNone(loaded.user_id)
```

- [ ] **Step 2: Run test — expect ImportError (module doesn't exist)**

```
cd backend && python -m pytest tests/test_funnel_models.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.models.funnel'`

- [ ] **Step 3: Create `backend/app/models/funnel.py`**

```python
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, String, Uuid, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AnonymousSession(Base):
    __tablename__ = "anonymous_sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_token: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), unique=True, index=True, default=uuid.uuid4
    )
    profile_data: Mapped[dict[str, Any]] = mapped_column(
        JSONB(astext_type=String()), nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)


class ConversionEvent(Base):
    __tablename__ = "conversion_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    session_token: Mapped[uuid.UUID | None] = mapped_column(
        Uuid(as_uuid=True), nullable=True, index=True
    )
    user_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_name: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    properties: Mapped[dict[str, Any]] = mapped_column(
        JSONB(astext_type=String()), nullable=False, default=dict
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class UserSubscription(Base):
    __tablename__ = "user_subscriptions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    stripe_customer_id: Mapped[str] = mapped_column(String(100), nullable=False)
    stripe_subscription_id: Mapped[str] = mapped_column(String(100), nullable=False)
    tier: Mapped[str] = mapped_column(String(20), nullable=False, default="free")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    trial_started_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    trial_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 4: Run tests — expect PASS**

```
cd backend && python -m pytest tests/test_funnel_models.py -v
```
Expected: 3 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/models/funnel.py backend/tests/test_funnel_models.py
git commit -m "feat: add funnel ORM models (AnonymousSession, ConversionEvent, UserSubscription)"
```

---

### Task 2: Pydantic Schemas

**Files:**
- Create: `backend/app/schemas/funnel.py`

- [ ] **Step 1: Create `backend/app/schemas/funnel.py`**

```python
import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, EmailStr


# ── Session ────────────────────────────────────────────────────────────────
class CreateSessionRequest(BaseModel):
    name: str
    age: int
    gender: str
    height_cm: float
    weight_kg: float
    goal_weight_kg: float
    timeline_weeks: int
    health_conditions: str = ""
    activity_level: str
    diet_pattern: str


class SessionCreatedResponse(BaseModel):
    session_id: str  # UUID as string, for display/debugging only (not the httpOnly cookie)


# ── Preview ────────────────────────────────────────────────────────────────
class PreviewResponse(BaseModel):
    name: str
    goal_weight_kg: float
    timeline_weeks: int
    calories: int
    protein_g: int
    carbs_g: int
    fat_g: int
    deficit_rate: int       # kcal/day deficit applied
    weekly_loss_kg_estimate: float


# ── Convert ────────────────────────────────────────────────────────────────
class ConvertRequest(BaseModel):
    email: EmailStr
    password: str
    payment_method_id: str


class ConvertResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ── Events ─────────────────────────────────────────────────────────────────
class TrackEventRequest(BaseModel):
    event_name: str
    session_token: uuid.UUID | None = None
    properties: dict[str, Any] = {}


# ── Stats ──────────────────────────────────────────────────────────────────
class FunnelStatsResponse(BaseModel):
    landing_views: int
    onboarding_starts: int
    onboarding_completions: int
    preview_views: int
    upgrade_clicks: int
    conversions: int
    plans_generated: int


# ── Stripe Webhook ─────────────────────────────────────────────────────────
class StripeWebhookResponse(BaseModel):
    received: bool = True
```

- [ ] **Step 2: Verify schemas import cleanly**

```
cd backend && python -c "from app.schemas.funnel import CreateSessionRequest, PreviewResponse, ConvertRequest; print('OK')"
```
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add backend/app/schemas/funnel.py
git commit -m "feat: add funnel Pydantic schemas"
```

---

### Task 3: Alembic Migration

**Files:**
- Create: `backend/alembic/versions/a1b2c3d4e5f6_add_funnel_tables.py`

- [ ] **Step 1: Create migration file**

```python
# backend/alembic/versions/a1b2c3d4e5f6_add_funnel_tables.py
"""add_funnel_tables

Revision ID: a1b2c3d4e5f6
Revises: d9e8f7a6b5c4
Create Date: 2026-04-06 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "d9e8f7a6b5c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "anonymous_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_token", sa.UUID(), nullable=False),
        sa.Column(
            "profile_data",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_anonymous_sessions_session_token"),
        "anonymous_sessions",
        ["session_token"],
        unique=True,
    )

    op.create_table(
        "conversion_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_token", sa.UUID(), nullable=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("event_name", sa.String(length=100), nullable=False),
        sa.Column(
            "properties",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default="{}",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_conversion_events_session_token"),
        "conversion_events",
        ["session_token"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversion_events_user_id"),
        "conversion_events",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_conversion_events_event_name"),
        "conversion_events",
        ["event_name"],
        unique=False,
    )

    op.create_table(
        "user_subscriptions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("stripe_customer_id", sa.String(length=100), nullable=False),
        sa.Column("stripe_subscription_id", sa.String(length=100), nullable=False),
        sa.Column("tier", sa.String(length=20), nullable=False, server_default="free"),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
        sa.Column("trial_started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("trial_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_user_subscriptions_user_id"),
        "user_subscriptions",
        ["user_id"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_subscriptions_user_id"), table_name="user_subscriptions")
    op.drop_table("user_subscriptions")

    op.drop_index(op.f("ix_conversion_events_event_name"), table_name="conversion_events")
    op.drop_index(op.f("ix_conversion_events_user_id"), table_name="conversion_events")
    op.drop_index(op.f("ix_conversion_events_session_token"), table_name="conversion_events")
    op.drop_table("conversion_events")

    op.drop_index(op.f("ix_anonymous_sessions_session_token"), table_name="anonymous_sessions")
    op.drop_table("anonymous_sessions")
```

- [ ] **Step 2: Copy .env and run migration**

```bash
cp D:/WeightLoss/backend/.env backend/.env
cd backend && alembic upgrade head
```
Expected: `Running upgrade d9e8f7a6b5c4 -> a1b2c3d4e5f6, add_funnel_tables`

- [ ] **Step 3: Commit**

```bash
git add backend/alembic/versions/a1b2c3d4e5f6_add_funnel_tables.py
git commit -m "feat: add funnel tables migration (anonymous_sessions, conversion_events, user_subscriptions)"
```

---

### Task 4: Update models `__init__` + Config Stripe vars

**Files:**
- Modify: `backend/app/models/__init__.py`
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Update `backend/app/models/__init__.py`**

Add three imports and exports (keep all existing lines, add to bottom of imports and `__all__`):

```python
from app.models.funnel import AnonymousSession, ConversionEvent, UserSubscription
```

And in `__all__`:
```python
"AnonymousSession",
"ConversionEvent",
"UserSubscription",
```

- [ ] **Step 2: Add Stripe settings to `backend/app/core/config.py`**

In the `Settings` dataclass, add after `ai_services_url`:
```python
    stripe_secret_key: str
    stripe_webhook_secret: str
    stripe_pro_price_id: str
```

In `from_env()`, add after `ai_services_url=...`:
```python
            stripe_secret_key=os.environ.get("STRIPE_SECRET_KEY", ""),
            stripe_webhook_secret=os.environ.get("STRIPE_WEBHOOK_SECRET", ""),
            stripe_pro_price_id=os.environ.get("STRIPE_PRO_PRICE_ID", ""),
```

- [ ] **Step 3: Verify import**

```
cd backend && python -c "from app.models import AnonymousSession, UserSubscription; print('OK')"
```
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add backend/app/models/__init__.py backend/app/core/config.py
git commit -m "feat: register funnel models in __init__, add Stripe config vars"
```

---

### Task 5: FunnelService

**Files:**
- Create: `backend/app/services/funnel_service.py`
- Create: `backend/tests/test_funnel_service.py`

- [ ] **Step 1: Write the failing tests**

```python
# backend/tests/test_funnel_service.py
import sys
import unittest
import uuid
from datetime import UTC, datetime, timedelta
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import AnonymousSession, UserSubscription
from app.models.user import User
from app.core.security import get_password_hash
from app.services.funnel_service import FunnelService


_PROFILE = {
    "name": "Alex",
    "age": 30,
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 90,
    "goal_weight_kg": 75,
    "timeline_weeks": 20,
    "health_conditions": "",
    "activity_level": "moderate",
    "diet_pattern": "balanced",
}


class FunnelServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        self.factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False, class_=Session)
        Base.metadata.create_all(self.engine)
        self.svc = FunnelService()

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def test_create_session_stores_profile_and_returns_token(self) -> None:
        with self.factory() as session:
            anon = self.svc.create_session(session, _PROFILE)
            self.assertIsNotNone(anon.session_token)
            self.assertEqual(anon.profile_data["name"], "Alex")
            future = anon.expires_at.replace(tzinfo=UTC)
            self.assertGreater(future, datetime.now(UTC) + timedelta(hours=71))

    def test_get_session_by_token_found(self) -> None:
        with self.factory() as session:
            anon = self.svc.create_session(session, _PROFILE)
            token = anon.session_token
        with self.factory() as session:
            loaded = self.svc.get_session_by_token(session, token)
            self.assertIsNotNone(loaded)
            self.assertEqual(loaded.session_token, token)

    def test_get_session_by_token_not_found(self) -> None:
        with self.factory() as session:
            result = self.svc.get_session_by_token(session, uuid.uuid4())
            self.assertIsNone(result)

    def test_calculate_preview_mifflin(self) -> None:
        # Male, 30yo, 175cm, 90kg, moderate activity
        # BMR = 10*90 + 6.25*175 - 5*30 + 5 = 900 + 1093.75 - 150 + 5 = 1848.75
        # TDEE = 1848.75 * 1.55 = 2865.56
        # Target = 2865.56 - 500 = 2365.56 → 2366 kcal
        result = self.svc.calculate_preview(_PROFILE)
        self.assertAlmostEqual(result["calories"], 2366, delta=5)
        self.assertGreater(result["protein_g"], 0)
        self.assertGreater(result["carbs_g"], 0)
        self.assertGreater(result["fat_g"], 0)
        self.assertEqual(result["deficit_rate"], 500)

    def test_calculate_preview_female(self) -> None:
        profile = {**_PROFILE, "gender": "female"}
        # BMR = 10*90 + 6.25*175 - 5*30 - 161 = 1687.75
        # TDEE = 1687.75 * 1.55 = 2616.01
        # Target = 2616.01 - 500 = 2116.01 → 2116 kcal
        result = self.svc.calculate_preview(profile)
        self.assertAlmostEqual(result["calories"], 2116, delta=5)

    def test_track_event_persists(self) -> None:
        with self.factory() as session:
            self.svc.track_event(session, "landing_viewed", None, None, {})
            session.commit()
        with self.factory() as session:
            from app.models.funnel import ConversionEvent
            from sqlalchemy import select
            events = session.scalars(select(ConversionEvent).where(
                ConversionEvent.event_name == "landing_viewed"
            )).all()
            self.assertEqual(len(events), 1)
```

- [ ] **Step 2: Run — expect ImportError**

```
cd backend && python -m pytest tests/test_funnel_service.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.services.funnel_service'`

- [ ] **Step 3: Create `backend/app/services/funnel_service.py`**

```python
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.funnel import AnonymousSession, ConversionEvent, UserSubscription

_ACTIVITY_MULTIPLIERS = {
    "sedentary": 1.2,
    "light": 1.375,
    "moderate": 1.55,
    "high": 1.725,
    "very_high": 1.9,
}
_STATS_CACHE: dict[str, Any] = {}
_STATS_TTL_SECONDS = 300
_STATS_SEED_PLANS = 14280


class FunnelService:
    def create_session(self, session: Session, profile_data: dict[str, Any]) -> AnonymousSession:
        now = datetime.now(UTC)
        anon = AnonymousSession(
            session_token=uuid.uuid4(),
            profile_data=profile_data,
            created_at=now,
            expires_at=now + timedelta(hours=72),
        )
        session.add(anon)
        session.commit()
        session.refresh(anon)
        return anon

    def get_session_by_token(
        self, session: Session, token: uuid.UUID
    ) -> AnonymousSession | None:
        return session.scalar(
            select(AnonymousSession).where(AnonymousSession.session_token == token)
        )

    def calculate_preview(self, profile_data: dict[str, Any]) -> dict[str, Any]:
        weight = float(profile_data.get("weight_kg", 0))
        height = float(profile_data.get("height_cm", 0))
        age = int(profile_data.get("age", 0))
        gender = str(profile_data.get("gender", "male")).lower()
        activity = str(profile_data.get("activity_level", "moderate")).lower()
        goal_weight = float(profile_data.get("goal_weight_kg", weight))
        timeline = int(profile_data.get("timeline_weeks", 12))

        # Mifflin-St Jeor
        if gender == "female":
            bmr = 10 * weight + 6.25 * height - 5 * age - 161
        else:
            bmr = 10 * weight + 6.25 * height - 5 * age + 5

        multiplier = _ACTIVITY_MULTIPLIERS.get(activity, 1.55)
        tdee = bmr * multiplier
        deficit = 500
        calorie_target = round(tdee - deficit)

        protein_g = round(calorie_target * 0.30 / 4)
        carbs_g = round(calorie_target * 0.40 / 4)
        fat_g = round(calorie_target * 0.30 / 9)
        weekly_loss_kg = round((deficit * 7) / 7700, 2)

        return {
            "name": str(profile_data.get("name", "")),
            "goal_weight_kg": goal_weight,
            "timeline_weeks": timeline,
            "calories": calorie_target,
            "protein_g": protein_g,
            "carbs_g": carbs_g,
            "fat_g": fat_g,
            "deficit_rate": deficit,
            "weekly_loss_kg_estimate": weekly_loss_kg,
        }

    def track_event(
        self,
        session: Session,
        event_name: str,
        session_token: uuid.UUID | None,
        user_id: int | None,
        properties: dict[str, Any],
    ) -> None:
        event = ConversionEvent(
            event_name=event_name,
            session_token=session_token,
            user_id=user_id,
            properties=properties,
        )
        session.add(event)
        # caller is responsible for commit (fire-and-forget pattern)

    def get_stats(self, session: Session) -> dict[str, int]:
        now = datetime.now(UTC).timestamp()
        cached_at = _STATS_CACHE.get("cached_at", 0)
        if now - cached_at < _STATS_TTL_SECONDS and "data" in _STATS_CACHE:
            return _STATS_CACHE["data"]  # type: ignore[return-value]

        def count(name: str) -> int:
            from sqlalchemy import func
            return session.scalar(
                select(func.count()).select_from(ConversionEvent).where(
                    ConversionEvent.event_name == name
                )
            ) or 0

        conversions = count("conversion_completed")
        data = {
            "landing_views": count("landing_viewed"),
            "onboarding_starts": count("onboarding_started"),
            "onboarding_completions": count("onboarding_step_completed"),
            "preview_views": count("preview_viewed"),
            "upgrade_clicks": count("upgrade_clicked"),
            "conversions": conversions,
            "plans_generated": _STATS_SEED_PLANS + conversions,
        }
        _STATS_CACHE["data"] = data
        _STATS_CACHE["cached_at"] = now
        return data

    def get_subscription_access(
        self, session: Session, user_id: int
    ) -> dict[str, Any]:
        sub = session.scalar(
            select(UserSubscription).where(UserSubscription.user_id == user_id)
        )
        if sub is None:
            return {"tier": "free", "trial_active": False}
        trial_active = (
            sub.trial_expires_at is not None
            and sub.trial_expires_at.replace(tzinfo=UTC) > datetime.now(UTC)
        )
        return {"tier": sub.tier, "trial_active": trial_active, "status": sub.status}
```

- [ ] **Step 4: Run tests — expect PASS**

```
cd backend && python -m pytest tests/test_funnel_service.py -v
```
Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/funnel_service.py backend/tests/test_funnel_service.py
git commit -m "feat: add FunnelService (session CRUD, preview calc, stats cache, event tracking)"
```

---

### Task 6: StripeService

**Files:**
- Create: `backend/app/services/stripe_service.py`

- [ ] **Step 1: Install stripe**

```
cd backend && pip install stripe
```

Verify it appears in `requirements.txt` or `pyproject.toml`. If using `requirements.txt`:
```
echo "stripe>=9.0.0" >> requirements.txt
```

- [ ] **Step 2: Write failing test**

```python
# backend/tests/test_stripe_service.py
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.stripe_service import StripeService


class StripeServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.svc = StripeService(secret_key="sk_test_fake", pro_price_id="price_test")

    @patch("app.services.stripe_service.stripe")
    def test_create_customer_and_subscription(self, mock_stripe: MagicMock) -> None:
        mock_stripe.Customer.create.return_value = MagicMock(id="cus_abc123")
        mock_stripe.Subscription.create.return_value = MagicMock(
            id="sub_def456", status="trialing"
        )

        customer_id, subscription_id = self.svc.create_subscription(
            email="test@example.com",
            payment_method_id="pm_test123",
        )

        self.assertEqual(customer_id, "cus_abc123")
        self.assertEqual(subscription_id, "sub_def456")
        mock_stripe.Customer.create.assert_called_once_with(
            email="test@example.com",
            payment_method="pm_test123",
            invoice_settings={"default_payment_method": "pm_test123"},
        )
        mock_stripe.Subscription.create.assert_called_once_with(
            customer="cus_abc123",
            items=[{"price": "price_test"}],
            trial_period_days=7,
            payment_settings={"save_default_payment_method": "on_subscription"},
        )

    @patch("app.services.stripe_service.stripe")
    def test_validate_webhook_valid(self, mock_stripe: MagicMock) -> None:
        mock_stripe.Webhook.construct_event.return_value = {"type": "customer.subscription.updated"}
        event = self.svc.validate_webhook(b"payload", "sig_header", "whsec_test")
        self.assertEqual(event["type"], "customer.subscription.updated")

    @patch("app.services.stripe_service.stripe")
    def test_validate_webhook_invalid_raises(self, mock_stripe: MagicMock) -> None:
        import stripe as real_stripe
        mock_stripe.Webhook.construct_event.side_effect = real_stripe.SignatureVerificationError(
            "bad sig", "sig_header"
        )
        with self.assertRaises(ValueError):
            self.svc.validate_webhook(b"payload", "bad_sig", "whsec_test")
```

- [ ] **Step 3: Run — expect ImportError**

```
cd backend && python -m pytest tests/test_stripe_service.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.services.stripe_service'`

- [ ] **Step 4: Create `backend/app/services/stripe_service.py`**

```python
from typing import Any

import stripe
import stripe.error


class StripeService:
    def __init__(self, secret_key: str, pro_price_id: str) -> None:
        self._pro_price_id = pro_price_id
        stripe.api_key = secret_key

    def create_subscription(
        self,
        email: str,
        payment_method_id: str,
    ) -> tuple[str, str]:
        """Returns (stripe_customer_id, stripe_subscription_id)."""
        customer = stripe.Customer.create(
            email=email,
            payment_method=payment_method_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )
        subscription = stripe.Subscription.create(
            customer=customer.id,
            items=[{"price": self._pro_price_id}],
            trial_period_days=7,
            payment_settings={"save_default_payment_method": "on_subscription"},
        )
        return customer.id, subscription.id

    def validate_webhook(
        self,
        payload: bytes,
        sig_header: str,
        webhook_secret: str,
    ) -> dict[str, Any]:
        try:
            return stripe.Webhook.construct_event(payload, sig_header, webhook_secret)  # type: ignore[return-value]
        except stripe.error.SignatureVerificationError as exc:
            raise ValueError("Invalid Stripe webhook signature") from exc
```

- [ ] **Step 5: Run tests — expect PASS**

```
cd backend && python -m pytest tests/test_stripe_service.py -v
```
Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/services/stripe_service.py backend/tests/test_stripe_service.py
git commit -m "feat: add StripeService (customer + subscription + webhook validation)"
```

---

### Task 7: Funnel API Endpoints

**Files:**
- Create: `backend/app/api/v1/endpoints/funnel.py`
- Modify: `backend/app/api/v1/router.py`
- Create: `backend/tests/test_funnel_api.py`

- [ ] **Step 1: Write failing API tests**

```python
# backend/tests/test_funnel_api.py
import sys
import unittest
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tests.support import ApiTestCase


_PROFILE_PAYLOAD = {
    "name": "Alex",
    "age": 30,
    "gender": "male",
    "height_cm": 175,
    "weight_kg": 90,
    "goal_weight_kg": 75,
    "timeline_weeks": 20,
    "health_conditions": "",
    "activity_level": "moderate",
    "diet_pattern": "balanced",
}


class FunnelApiTest(ApiTestCase):
    def test_create_session_sets_cookie(self) -> None:
        resp = self.client.post("/api/v1/funnel/sessions", json=_PROFILE_PAYLOAD)
        self.assertEqual(resp.status_code, 201)
        self.assertIn("funnel_session", resp.cookies)

    def test_preview_without_cookie_returns_401(self) -> None:
        resp = self.client.get("/api/v1/funnel/preview")
        self.assertEqual(resp.status_code, 401)

    def test_preview_with_valid_session(self) -> None:
        self.client.post("/api/v1/funnel/sessions", json=_PROFILE_PAYLOAD)
        resp = self.client.get("/api/v1/funnel/preview")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["name"], "Alex")
        self.assertIn("calories", data)
        self.assertIn("protein_g", data)

    def test_track_event_fire_and_forget(self) -> None:
        resp = self.client.post(
            "/api/v1/funnel/events",
            json={"event_name": "landing_viewed", "properties": {}},
        )
        self.assertEqual(resp.status_code, 204)

    def test_stats_returns_counts(self) -> None:
        resp = self.client.get("/api/v1/funnel/stats")
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("plans_generated", data)
        self.assertGreaterEqual(data["plans_generated"], 14280)

    @patch("app.api.v1.endpoints.funnel._stripe_service")
    def test_convert_creates_user_and_returns_token(self, mock_stripe: MagicMock) -> None:
        mock_stripe.create_subscription.return_value = ("cus_test", "sub_test")

        # Create session first
        self.client.post("/api/v1/funnel/sessions", json=_PROFILE_PAYLOAD)

        resp = self.client.post(
            "/api/v1/funnel/convert",
            json={
                "email": "new@example.com",
                "password": "password123",
                "payment_method_id": "pm_test",
            },
        )
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("access_token", data)

    @patch("app.api.v1.endpoints.funnel._stripe_service")
    def test_convert_is_idempotent(self, mock_stripe: MagicMock) -> None:
        mock_stripe.create_subscription.return_value = ("cus_test", "sub_test")
        self.client.post("/api/v1/funnel/sessions", json=_PROFILE_PAYLOAD)
        payload = {
            "email": "idem@example.com",
            "password": "password123",
            "payment_method_id": "pm_test",
        }
        r1 = self.client.post("/api/v1/funnel/convert", json=payload)
        r2 = self.client.post("/api/v1/funnel/convert", json=payload)
        self.assertEqual(r1.status_code, 200)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r1.json()["access_token"], r2.json()["access_token"])
```

- [ ] **Step 2: Run — expect 404s (router not registered)**

```
cd backend && python -m pytest tests/test_funnel_api.py -v
```
Expected: tests fail with 404 or import errors.

- [ ] **Step 3: Create `backend/app/api/v1/endpoints/funnel.py`**

```python
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import create_access_token, get_password_hash
from app.db.session import get_db_session
from app.models.funnel import UserSubscription
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

_settings = get_settings()
_stripe_service = StripeService(
    secret_key=_settings.stripe_secret_key,
    pro_price_id=_settings.stripe_pro_price_id,
)


def _get_session_token(funnel_session: str | None = Cookie(default=None)) -> uuid.UUID:
    if not funnel_session:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="No funnel session")
    try:
        return uuid.UUID(funnel_session)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token")


@router.post("/sessions", status_code=status.HTTP_201_CREATED, response_model=SessionCreatedResponse)
def create_session(
    payload: CreateSessionRequest,
    response: Response,
    session: Session = Depends(get_db_session),
) -> SessionCreatedResponse:
    profile_data = payload.model_dump()
    anon = _funnel_service.create_session(session, profile_data)
    response.set_cookie(
        key="funnel_session",
        value=str(anon.session_token),
        httponly=True,
        samesite="lax",
        max_age=72 * 3600,
        path="/",
    )
    return SessionCreatedResponse(session_id=str(anon.session_token))


@router.get("/preview", response_model=PreviewResponse)
def get_preview(
    token: uuid.UUID = Depends(_get_session_token),
    session: Session = Depends(get_db_session),
) -> PreviewResponse:
    anon = _funnel_service.get_session_by_token(session, token)
    if anon is None or anon.expires_at.replace(tzinfo=UTC) < datetime.now(UTC):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired")
    result = _funnel_service.calculate_preview(anon.profile_data)
    return PreviewResponse(**result)


@router.post("/convert", response_model=ConvertResponse)
def convert(
    payload: ConvertRequest,
    token: uuid.UUID = Depends(_get_session_token),
    session: Session = Depends(get_db_session),
) -> ConvertResponse:
    from sqlalchemy import select

    # Idempotency: if user with this email already exists, return their token
    existing_user = session.scalar(select(User).where(User.email == payload.email))
    if existing_user is not None:
        access_token = create_access_token(subject=str(existing_user.id))
        return ConvertResponse(access_token=access_token)

    anon = _funnel_service.get_session_by_token(session, token)
    if anon is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session not found")

    customer_id, subscription_id = _stripe_service.create_subscription(
        email=payload.email,
        payment_method_id=payload.payment_method_id,
    )

    user = User(
        email=payload.email,
        full_name=str(anon.profile_data.get("name", "")),
        hashed_password=get_password_hash(payload.password),
    )
    session.add(user)
    session.flush()

    now = datetime.now(UTC)
    sub = UserSubscription(
        user_id=user.id,
        stripe_customer_id=customer_id,
        stripe_subscription_id=subscription_id,
        tier="free",
        status="active",
        trial_started_at=now,
        trial_expires_at=now + timedelta(days=7),
    )
    session.add(sub)
    session.commit()

    _funnel_service.track_event(
        session, "conversion_completed", token, user.id,
        {"email": payload.email},
    )
    session.commit()

    access_token = create_access_token(subject=str(user.id))
    return ConvertResponse(access_token=access_token)


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


@router.get("/stats", response_model=FunnelStatsResponse)
def get_stats(session: Session = Depends(get_db_session)) -> FunnelStatsResponse:
    data = _funnel_service.get_stats(session)
    return FunnelStatsResponse(**data)


@router.post("/stripe-webhook", response_model=StripeWebhookResponse)
async def stripe_webhook(
    request: Request,
    session: Session = Depends(get_db_session),
) -> StripeWebhookResponse:
    from sqlalchemy import select

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    settings = get_settings()

    try:
        event = _stripe_service.validate_webhook(payload, sig_header, settings.stripe_webhook_secret)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid webhook")

    event_type = event.get("type", "")
    if event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        data_obj = event.get("data", {}).get("object", {})
        stripe_sub_id = data_obj.get("id")
        new_status = data_obj.get("status", "active")
        if stripe_sub_id:
            sub = session.scalar(
                select(UserSubscription).where(
                    UserSubscription.stripe_subscription_id == stripe_sub_id
                )
            )
            if sub is not None:
                sub.status = new_status
                if new_status == "active":
                    sub.tier = "pro"
                elif event_type == "customer.subscription.deleted":
                    sub.tier = "free"
                session.commit()

    return StripeWebhookResponse()
```

- [ ] **Step 4: Register router in `backend/app/api/v1/router.py`**

Add at the top (with other imports):
```python
from app.api.v1.endpoints.funnel import router as funnel_router
```

Add after the last `router.include_router(...)` line:
```python
router.include_router(funnel_router, tags=["funnel"])
```

- [ ] **Step 5: Run tests — expect PASS**

```
cd backend && python -m pytest tests/test_funnel_api.py -v
```
Expected: all 7 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/funnel.py backend/app/api/v1/router.py backend/tests/test_funnel_api.py
git commit -m "feat: add funnel API endpoints (sessions, preview, convert, events, stats, webhook)"
```

---

### Task 8: Subscription Guard on `/plans/today`

**Files:**
- Modify: `backend/app/api/v1/endpoints/plans.py`
- Create: `backend/tests/test_plans_subscription_guard.py`

- [ ] **Step 1: Write failing test**

```python
# backend/tests/test_plans_subscription_guard.py
import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tests.support import ApiTestCase
from app.models.funnel import UserSubscription
from app.models.plan import Plan


class PlansSubscriptionGuardTest(ApiTestCase):
    def _create_plan(self, user_id: int) -> None:
        with self.session_factory() as session:
            plan = Plan(
                user_id=user_id,
                title="Test plan",
                status="active",
                plan={
                    "intent": "lose weight",
                    "meals": [{"meal": "breakfast", "name": "oats"}],
                    "activity": [],
                    "behavioral_actions": [],
                    "lab_insights": [],
                    "risks": [],
                    "recommendations": [],
                    "adherence_signals": [],
                    "constraints_applied": [],
                    "biomarker_adjustments": [],
                },
            )
            session.add(plan)
            session.commit()

    def _add_expired_subscription(self, user_id: int) -> None:
        with self.session_factory() as session:
            sub = UserSubscription(
                user_id=user_id,
                stripe_customer_id="cus_test",
                stripe_subscription_id="sub_test",
                tier="free",
                status="active",
                trial_started_at=datetime.now(UTC) - timedelta(days=14),
                trial_expires_at=datetime.now(UTC) - timedelta(days=7),
            )
            session.add(sub)
            session.commit()

    def _add_active_subscription(self, user_id: int) -> None:
        with self.session_factory() as session:
            sub = UserSubscription(
                user_id=user_id,
                stripe_customer_id="cus_test",
                stripe_subscription_id="sub_test",
                tier="pro",
                status="active",
                trial_started_at=datetime.now(UTC),
                trial_expires_at=datetime.now(UTC) + timedelta(days=7),
            )
            session.add(sub)
            session.commit()

    def test_plan_today_locked_when_trial_expired(self) -> None:
        user = self.create_user()
        self._create_plan(user.id)
        self._add_expired_subscription(user.id)
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/plans/today", headers=headers)
        self.assertEqual(resp.status_code, 402)
        self.assertEqual(resp.json()["detail"], "subscription_required")

    def test_plan_today_accessible_during_active_trial(self) -> None:
        user = self.create_user()
        self._create_plan(user.id)
        self._add_active_subscription(user.id)
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/plans/today", headers=headers)
        self.assertEqual(resp.status_code, 200)

    def test_plan_today_accessible_with_no_subscription(self) -> None:
        """Users with no subscription record are pre-trial — full access."""
        user = self.create_user()
        self._create_plan(user.id)
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/plans/today", headers=headers)
        self.assertEqual(resp.status_code, 200)
```

- [ ] **Step 2: Run — expect FAIL (no 402 logic yet)**

```
cd backend && python -m pytest tests/test_plans_subscription_guard.py -v
```
Expected: `test_plan_today_locked_when_trial_expired` fails (returns 200, not 402).

- [ ] **Step 3: Modify `backend/app/api/v1/endpoints/plans.py`**

Replace the entire file:

```python
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.funnel import UserSubscription
from app.models.user import User
from app.schemas.plan import PlanCreate, PlanResponse
from app.services.plan_service import PlanService

router = APIRouter(prefix="/plans")
plan_service = PlanService()


def _check_subscription(session: Session, user: User) -> None:
    """Raises HTTP 402 if the user's trial has expired and they are not Pro."""
    sub = session.scalar(select(UserSubscription).where(UserSubscription.user_id == user.id))
    if sub is None:
        return  # no subscription record = pre-trial, full access
    if sub.tier == "pro" and sub.status == "active":
        return
    trial_active = (
        sub.trial_expires_at is not None
        and sub.trial_expires_at.replace(tzinfo=UTC) > datetime.now(UTC)
    )
    if not trial_active:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="subscription_required",
        )


@router.post("", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(
    payload: PlanCreate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PlanResponse:
    return plan_service.create_plan(session, current_user, payload)


@router.get("/today", response_model=PlanResponse)
def get_today_plan(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> PlanResponse:
    _check_subscription(session, current_user)
    plan = plan_service.get_latest_plan(session, current_user)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No plan found.")
    return plan
```

- [ ] **Step 4: Run tests — expect PASS**

```
cd backend && python -m pytest tests/test_plans_subscription_guard.py -v
```
Expected: all 3 tests pass.

- [ ] **Step 5: Run full backend test suite to confirm no regressions**

```
cd backend && python -m pytest tests/ -v
```
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/v1/endpoints/plans.py backend/tests/test_plans_subscription_guard.py
git commit -m "feat: add subscription guard to /plans/today (HTTP 402 when trial expired)"
```

---

### Task 9: Frontend Analytics Extension

**Files:**
- Modify: `frontend/lib/analytics.ts`

- [ ] **Step 1: Extend `AnalyticsEventName` union and add `trackFunnelEvent`**

In `frontend/lib/analytics.ts`, replace the `AnalyticsEventName` type with:

```typescript
export type AnalyticsEventName =
  | 'profile_questionnaire_started'
  | 'wizard_step_completed'
  | 'wizard_step_dropped'
  | 'wizard_completed'
  | 'mindmap_node_completed'
  | 'profile_questionnaire_completed'
  | 'ux_mode_preference_set'
  | 'ux_mode_resolved'
  | 'ux_mode_switched'
  // funnel events
  | 'landing_viewed'
  | 'landing_variant_viewed'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_abandoned'
  | 'preview_viewed'
  | 'upgrade_clicked'
  | 'checkout_started'
  | 'conversion_completed'
  | 'trial_expired'
```

Add this function at the bottom of the file (after `trackEvent`):

```typescript
/**
 * Fire-and-forget funnel event. Sends to /funnel/events — no auth required.
 * Never throws.
 */
export function trackFunnelEvent(
  eventName: AnalyticsEventName,
  properties: Record<string, unknown> = {},
): void {
  fetch(`${apiBaseUrl}/api/v1/funnel/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ event_name: eventName, properties }),
  }).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[funnel-analytics] Event dropped:', eventName, err)
    }
  })
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/analytics.ts
git commit -m "feat: extend analytics with funnel event names + trackFunnelEvent helper"
```

---

### Task 10: Frontend Feature Flags + A/B Testing

**Files:**
- Modify: `frontend/lib/feature-flags.ts`

- [ ] **Step 1: Add funnel A/B flags and helper to `frontend/lib/feature-flags.ts`**

Replace the entire file:

```typescript
export interface FeatureFlags {
  wizardEnabled: boolean
  mindmapEnabled: boolean
  abTestingEnabled: boolean
  wizardRolloutPct: number
  landingAbEnabled: boolean
  landingAbRollout: number
}

export function getFeatureFlags(): FeatureFlags {
  return {
    wizardEnabled: process.env.NEXT_PUBLIC_WIZARD_ENABLED === 'true',
    mindmapEnabled: process.env.NEXT_PUBLIC_MINDMAP_ENABLED !== 'false',
    abTestingEnabled: process.env.NEXT_PUBLIC_AB_TESTING_ENABLED === 'true',
    wizardRolloutPct: parseInt(process.env.NEXT_PUBLIC_WIZARD_ROLLOUT_PCT ?? '0', 10),
    landingAbEnabled: process.env.NEXT_PUBLIC_LANDING_AB_ENABLED === 'true',
    landingAbRollout: parseInt(process.env.NEXT_PUBLIC_LANDING_AB_ROLLOUT ?? '50', 10),
  }
}

export type FunnelVariants = {
  headline: 'A' | 'B'
  cta: 'A' | 'B'
}

const FUNNEL_AB_KEY = '_funnel_ab'

/**
 * Returns sticky A/B variants for the funnel landing page.
 * Assignment is per-session (sessionStorage). Server renders variant A.
 */
export function getFunnelVariants(): FunnelVariants {
  if (typeof window === 'undefined') return { headline: 'A', cta: 'A' }

  const stored = sessionStorage.getItem(FUNNEL_AB_KEY)
  if (stored) {
    try {
      return JSON.parse(stored) as FunnelVariants
    } catch {
      // fall through to reassign
    }
  }

  const flags = getFeatureFlags()
  const inVariantB = flags.landingAbEnabled && Math.random() * 100 < flags.landingAbRollout
  const variants: FunnelVariants = inVariantB
    ? { headline: 'B', cta: 'B' }
    : { headline: 'A', cta: 'A' }

  sessionStorage.setItem(FUNNEL_AB_KEY, JSON.stringify(variants))
  return variants
}
```

- [ ] **Step 2: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/feature-flags.ts
git commit -m "feat: add funnel A/B flags + getFunnelVariants() helper"
```

---

### Task 11: Frontend Infrastructure — `funnel-session.ts`, `stripe-client.ts`, Layout

**Files:**
- Create: `frontend/lib/funnel-session.ts`
- Create: `frontend/lib/stripe-client.ts`
- Create: `frontend/app/funnel/layout.tsx`

- [ ] **Step 1: Create `frontend/lib/funnel-session.ts`**

```typescript
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type FunnelProfile = {
  name: string
  age: number
  gender: string
  height_cm: number
  weight_kg: number
  goal_weight_kg: number
  timeline_weeks: number
  health_conditions: string
  activity_level: string
  diet_pattern: string
}

const FUNNEL_PROFILE_KEY = '_funnel_profile'

export function saveFunnelProfile(profile: FunnelProfile): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(FUNNEL_PROFILE_KEY, JSON.stringify(profile))
}

export function getFunnelProfile(): FunnelProfile | null {
  if (typeof window === 'undefined') return null
  const stored = sessionStorage.getItem(FUNNEL_PROFILE_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as FunnelProfile
  } catch {
    return null
  }
}

export function clearFunnelSession(): void {
  if (typeof window === 'undefined') return
  sessionStorage.removeItem(FUNNEL_PROFILE_KEY)
  sessionStorage.removeItem('_funnel_ab')
}

export async function createFunnelSession(profile: FunnelProfile): Promise<void> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(profile),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? 'Failed to create session')
  }
  saveFunnelProfile(profile)
}

export type FunnelPreview = {
  name: string
  goal_weight_kg: number
  timeline_weeks: number
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  deficit_rate: number
  weekly_loss_kg_estimate: number
}

export async function fetchFunnelPreview(): Promise<FunnelPreview> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/preview`, {
    credentials: 'include',
  })
  if (!resp.ok) {
    throw new Error('No session — please complete onboarding first')
  }
  return (await resp.json()) as FunnelPreview
}

export async function convertFunnelSession(payload: {
  email: string
  password: string
  paymentMethodId: string
}): Promise<string> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/convert`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      payment_method_id: payload.paymentMethodId,
    }),
  })
  if (!resp.ok) {
    const data = await resp.json().catch(() => ({}))
    throw new Error((data as { detail?: string }).detail ?? 'Checkout failed')
  }
  const data = (await resp.json()) as { access_token: string }
  return data.access_token
}

export async function fetchFunnelStats(): Promise<{ plans_generated: number }> {
  const resp = await fetch(`${apiBaseUrl}/api/v1/funnel/stats`)
  if (!resp.ok) return { plans_generated: 14280 }
  return (await resp.json()) as { plans_generated: number }
}
```

- [ ] **Step 2: Install Stripe frontend packages**

```
cd frontend && npm install @stripe/stripe-js @stripe/react-stripe-js
```

- [ ] **Step 3: Create `frontend/lib/stripe-client.ts`**

```typescript
import { loadStripe, type Stripe } from '@stripe/stripe-js'

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ''

let stripePromise: Promise<Stripe | null> | null = null

export function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey)
  }
  return stripePromise
}
```

- [ ] **Step 4: Create `frontend/app/funnel/layout.tsx`**

This layout suppresses the global `NavBarWrapper` that wraps all other pages:

```tsx
import type { ReactNode } from 'react'

export default function FunnelLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
```

- [ ] **Step 5: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/lib/funnel-session.ts frontend/lib/stripe-client.ts frontend/app/funnel/layout.tsx
git commit -m "feat: add funnel-session helpers, stripe client, funnel layout (no nav)"
```

---

### Task 12: Landing Page Shared Components

**Files:**
- Create: `frontend/app/funnel/components/funnel-hero.tsx`
- Create: `frontend/app/funnel/components/how-it-works.tsx`
- Create: `frontend/app/funnel/components/cost-anchor.tsx`
- Create: `frontend/app/funnel/components/social-proof/testimonial-card.tsx`
- Create: `frontend/app/funnel/components/social-proof/transformation-card.tsx`
- Create: `frontend/app/funnel/components/social-proof/plan-counter.tsx`

- [ ] **Step 1: Create `frontend/app/funnel/components/funnel-hero.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { getFunnelVariants } from '@/lib/feature-flags'
import { trackFunnelEvent } from '@/lib/analytics'

const HEADLINES = {
  A: 'Your AI Metabolic Coach',
  B: 'Lose Weight With a Plan Built for Your Body',
}

const CTAS = {
  A: 'Get your plan — it\'s free',
  B: 'Calculate my calories now',
}

export function FunnelHero() {
  const [variants, setVariants] = useState({ headline: 'A' as 'A' | 'B', cta: 'A' as 'A' | 'B' })

  useEffect(() => {
    const v = getFunnelVariants()
    setVariants(v)
    trackFunnelEvent('landing_variant_viewed', { headline_variant: v.headline, cta_variant: v.cta })
  }, [])

  return (
    <section className="flex flex-col items-center text-center px-4 pt-20 pb-12 gap-6">
      <h1 className="text-4xl sm:text-5xl font-bold text-white leading-tight max-w-2xl">
        {HEADLINES[variants.headline]}
      </h1>
      <p className="text-lg text-zinc-400 max-w-md">
        Answer 3 questions. Get your personalised calorie target and macro split in 60 seconds.
      </p>
      <Button asChild size="lg" className="mt-2 text-base px-8 py-4 h-auto">
        <Link href="/funnel/start">{CTAS[variants.cta]}</Link>
      </Button>
      <p className="text-xs text-zinc-500">No credit card required · Free forever for calorie tracking</p>
    </section>
  )
}
```

- [ ] **Step 2: Create `frontend/app/funnel/components/how-it-works.tsx`**

```tsx
export function HowItWorks() {
  const steps = [
    {
      number: '1',
      title: 'Answer 3 questions',
      description: 'Height, weight, goal, activity level. Takes under a minute.',
    },
    {
      number: '2',
      title: 'Get your free calorie plan',
      description: 'Your exact TDEE, calorie target, and macro split — calculated from your biometrics.',
    },
    {
      number: '3',
      title: 'Unlock meals + coaching for $9/mo',
      description: 'Full 7-day meal plan, weekly schedule, and AI coaching insights.',
    },
  ]

  return (
    <section className="px-4 py-12 max-w-3xl mx-auto">
      <h2 className="text-2xl font-semibold text-white text-center mb-10">How it works</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
        {steps.map((step) => (
          <div key={step.number} className="flex flex-col items-center text-center gap-3">
            <span className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-white font-bold text-lg">
              {step.number}
            </span>
            <h3 className="text-white font-medium">{step.title}</h3>
            <p className="text-zinc-400 text-sm">{step.description}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
```

- [ ] **Step 3: Create `frontend/app/funnel/components/cost-anchor.tsx`**

```tsx
export function CostAnchor() {
  return (
    <section className="px-4 py-8 max-w-xl mx-auto text-center">
      <p className="text-zinc-300 text-lg">
        Less than a coffee.{' '}
        <span className="text-zinc-500">A nutritionist charges $150/session.</span>
      </p>
      <p className="text-zinc-500 text-sm mt-2">
        $9/month · Cancel anytime · 7-day free trial
      </p>
    </section>
  )
}
```

- [ ] **Step 4: Create `frontend/app/funnel/components/social-proof/testimonial-card.tsx`**

```tsx
interface TestimonialCardProps {
  name: string
  result: string
  quote: string
}

export function TestimonialCard({ name, result, quote }: TestimonialCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col gap-3">
      <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 rounded-full px-3 py-1 self-start">
        {result}
      </span>
      <p className="text-zinc-300 text-sm leading-relaxed">&ldquo;{quote}&rdquo;</p>
      <p className="text-zinc-500 text-xs font-medium">— {name}</p>
    </div>
  )
}
```

- [ ] **Step 5: Create `frontend/app/funnel/components/social-proof/transformation-card.tsx`**

```tsx
interface TransformationCardProps {
  startWeight: string
  currentWeight: string
  weeks: number
}

export function TransformationCard({ startWeight, currentWeight, weeks }: TransformationCardProps) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex items-center gap-4">
      <div className="text-center">
        <p className="text-zinc-500 text-xs mb-1">Started</p>
        <p className="text-white font-bold text-xl">{startWeight}</p>
      </div>
      <div className="flex-1 flex flex-col items-center gap-1">
        <div className="w-full h-px bg-zinc-700 relative">
          <span className="absolute left-1/2 -translate-x-1/2 -top-3 text-xs text-zinc-500">
            {weeks} weeks
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-zinc-500 text-xs mb-1">Now</p>
        <p className="text-emerald-400 font-bold text-xl">{currentWeight}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 6: Create `frontend/app/funnel/components/social-proof/plan-counter.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'
import { fetchFunnelStats } from '@/lib/funnel-session'

export function PlanCounter() {
  const [count, setCount] = useState(14280)

  useEffect(() => {
    fetchFunnelStats().then((stats) => setCount(stats.plans_generated)).catch(() => {})
  }, [])

  return (
    <div className="flex items-center gap-2 text-sm text-zinc-400">
      <span className="font-bold text-white">{count.toLocaleString()}</span>
      <span>plans generated</span>
    </div>
  )
}
```

- [ ] **Step 7: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add frontend/app/funnel/components/
git commit -m "feat: add funnel landing page shared components (hero, how-it-works, social proof)"
```

---

### Task 13: Landing Page `/funnel/page.tsx`

**Files:**
- Create: `frontend/app/funnel/page.tsx`

- [ ] **Step 1: Create `frontend/app/funnel/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { trackFunnelEvent } from '@/lib/analytics'
import { CostAnchor } from './components/cost-anchor'
import { FunnelHero } from './components/funnel-hero'
import { HowItWorks } from './components/how-it-works'
import { PlanCounter } from './components/social-proof/plan-counter'
import { TestimonialCard } from './components/social-proof/testimonial-card'
import { TransformationCard } from './components/social-proof/transformation-card'

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    result: 'Lost 8kg in 10 weeks',
    quote: 'I\'d been guessing my calories for years. Getting an exact target changed everything.',
  },
  {
    name: 'James T.',
    result: 'Down 12kg in 14 weeks',
    quote: 'The macro split was the missing piece. I wasn\'t eating enough protein.',
  },
  {
    name: 'Priya K.',
    result: 'Lost 6kg in 8 weeks',
    quote: 'Simple, personalised, and actually worked. The meal plan saved me hours of planning.',
  },
]

export default function FunnelLandingPage() {
  useEffect(() => {
    trackFunnelEvent('landing_viewed')
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
        <span className="font-bold text-white text-lg">WeightLoss AI</span>
        <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
          Log in
        </Link>
      </nav>

      {/* Hero */}
      <FunnelHero />

      {/* Social proof strip */}
      <section className="px-4 py-6 border-y border-zinc-900 bg-zinc-900/50">
        <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-400">
          <PlanCounter />
          <span>Based on your biometrics</span>
          <span>No generic templates</span>
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Sample output preview — blurred */}
      <section className="px-4 py-8 max-w-sm mx-auto">
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900 p-6 overflow-hidden">
          <div className="blur-sm select-none pointer-events-none">
            <p className="text-zinc-400 text-xs mb-2">Your 7-day meal plan</p>
            <div className="space-y-2">
              {['Mon: Oat bowl + chicken salad', 'Tue: Greek yoghurt + salmon wrap', 'Wed: Eggs + steak + veggies'].map((line) => (
                <div key={line} className="bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300">
                  {line}
                </div>
              ))}
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/60 rounded-2xl">
            <span className="text-2xl">🔒</span>
            <p className="text-white font-medium text-sm">Unlock with Pro</p>
          </div>
        </div>
      </section>

      {/* Cost anchor */}
      <CostAnchor />

      {/* Testimonials */}
      <section className="px-4 py-10 max-w-3xl mx-auto">
        <h2 className="text-xl font-semibold text-white text-center mb-8">Real results</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <TestimonialCard key={t.name} {...t} />
          ))}
        </div>
      </section>

      {/* Transformation examples */}
      <section className="px-4 py-8 max-w-lg mx-auto">
        <div className="space-y-4">
          <TransformationCard startWeight="92kg" currentWeight="81kg" weeks={14} />
          <TransformationCard startWeight="78kg" currentWeight="68kg" weeks={12} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-12 text-center">
        <Button asChild size="lg" className="text-base px-8 py-4 h-auto">
          <Link href="/funnel/start">Get your plan — it&apos;s free</Link>
        </Button>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-zinc-900 text-center text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} WeightLoss AI · <Link href="/login" className="hover:text-zinc-400">Log in</Link></p>
      </footer>
    </main>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/funnel/page.tsx
git commit -m "feat: add /funnel landing page with A/B hero, social proof, and testimonials"
```

---

### Task 14: Onboarding Form + `/funnel/start`

**Files:**
- Create: `frontend/app/funnel/start/components/funnel-onboarding.tsx`
- Create: `frontend/app/funnel/start/page.tsx`

- [ ] **Step 1: Create `frontend/app/funnel/start/components/funnel-onboarding.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { trackFunnelEvent } from '@/lib/analytics'
import { type FunnelProfile, createFunnelSession } from '@/lib/funnel-session'

type Step1Fields = Pick<FunnelProfile, 'name' | 'age' | 'gender' | 'height_cm' | 'weight_kg'>
type Step2Fields = Pick<FunnelProfile, 'goal_weight_kg' | 'timeline_weeks' | 'health_conditions'>
type Step3Fields = Pick<FunnelProfile, 'activity_level' | 'diet_pattern'>

const EMPTY: FunnelProfile = {
  name: '',
  age: 0,
  gender: 'male',
  height_cm: 0,
  weight_kg: 0,
  goal_weight_kg: 0,
  timeline_weeks: 12,
  health_conditions: '',
  activity_level: 'moderate',
  diet_pattern: '',
}

export function FunnelOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [profile, setProfile] = useState<FunnelProfile>(EMPTY)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function update(fields: Partial<FunnelProfile>) {
    setProfile((p) => ({ ...p, ...fields }))
  }

  function handleStepComplete(nextStep: number) {
    trackFunnelEvent('onboarding_step_completed', { step })
    setStep(nextStep)
    if (nextStep > 1) {
      trackFunnelEvent('onboarding_started')
    }
  }

  async function handleFinish() {
    setLoading(true)
    setError('')
    try {
      await createFunnelSession(profile)
      trackFunnelEvent('onboarding_step_completed', { step: 3 })
      router.push('/funnel/preview')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Progress */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className={`flex-1 h-1 rounded-full transition-colors ${
              n <= step ? 'bg-white' : 'bg-zinc-800'
            }`}
          />
        ))}
      </div>

      {step === 1 && (
        <Step1
          values={profile}
          onChange={update}
          onNext={() => handleStepComplete(2)}
        />
      )}
      {step === 2 && (
        <Step2
          values={profile}
          onChange={update}
          onBack={() => setStep(1)}
          onNext={() => handleStepComplete(3)}
        />
      )}
      {step === 3 && (
        <Step3
          values={profile}
          onChange={update}
          onBack={() => setStep(2)}
          onFinish={handleFinish}
          loading={loading}
          error={error}
        />
      )}
    </div>
  )
}

function Step1({
  values,
  onChange,
  onNext,
}: {
  values: Step1Fields
  onChange: (f: Partial<FunnelProfile>) => void
  onNext: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-semibold text-white">About you</h2>
      <div className="space-y-2">
        <Label htmlFor="name" className="text-zinc-300">Name</Label>
        <Input
          id="name"
          required
          value={values.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="Alex"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="age" className="text-zinc-300">Age</Label>
          <Input
            id="age"
            type="number"
            required
            min={16}
            max={100}
            value={values.age || ''}
            onChange={(e) => onChange({ age: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="30"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-zinc-300">Gender</Label>
          <Select value={values.gender} onValueChange={(v) => onChange({ gender: v })}>
            <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="male">Male</SelectItem>
              <SelectItem value="female">Female</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height" className="text-zinc-300">Height (cm)</Label>
          <Input
            id="height"
            type="number"
            required
            min={100}
            max={250}
            value={values.height_cm || ''}
            onChange={(e) => onChange({ height_cm: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="175"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-zinc-300">Weight (kg)</Label>
          <Input
            id="weight"
            type="number"
            required
            min={30}
            max={300}
            value={values.weight_kg || ''}
            onChange={(e) => onChange({ weight_kg: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="90"
          />
        </div>
      </div>
      <Button type="submit" className="w-full">Next →</Button>
    </form>
  )
}

function Step2({
  values,
  onChange,
  onBack,
  onNext,
}: {
  values: Step2Fields
  onChange: (f: Partial<FunnelProfile>) => void
  onBack: () => void
  onNext: () => void
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onNext()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-semibold text-white">Your goal</h2>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="goal_weight" className="text-zinc-300">Goal weight (kg)</Label>
          <Input
            id="goal_weight"
            type="number"
            required
            min={30}
            max={300}
            value={values.goal_weight_kg || ''}
            onChange={(e) => onChange({ goal_weight_kg: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="75"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeline" className="text-zinc-300">Timeline (weeks)</Label>
          <Input
            id="timeline"
            type="number"
            required
            min={4}
            max={104}
            value={values.timeline_weeks || ''}
            onChange={(e) => onChange({ timeline_weeks: Number(e.target.value) })}
            className="bg-zinc-900 border-zinc-700 text-white"
            placeholder="16"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="conditions" className="text-zinc-300">
          Health conditions <span className="text-zinc-500">(optional)</span>
        </Label>
        <Input
          id="conditions"
          value={values.health_conditions}
          onChange={(e) => onChange({ health_conditions: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="e.g. diabetes, hypothyroidism"
        />
      </div>
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1">Next →</Button>
      </div>
    </form>
  )
}

function Step3({
  values,
  onChange,
  onBack,
  onFinish,
  loading,
  error,
}: {
  values: Step3Fields
  onChange: (f: Partial<FunnelProfile>) => void
  onBack: () => void
  onFinish: () => void
  loading: boolean
  error: string
}) {
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onFinish()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <h2 className="text-xl font-semibold text-white">Your lifestyle</h2>
      <div className="space-y-2">
        <Label className="text-zinc-300">Activity level</Label>
        <Select
          value={values.activity_level}
          onValueChange={(v) => onChange({ activity_level: v })}
        >
          <SelectTrigger className="bg-zinc-900 border-zinc-700 text-white">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="sedentary">Sedentary (desk job, no exercise)</SelectItem>
            <SelectItem value="light">Light (1–2 days/week)</SelectItem>
            <SelectItem value="moderate">Moderate (3–4 days/week)</SelectItem>
            <SelectItem value="high">High (5–6 days/week)</SelectItem>
            <SelectItem value="very_high">Very high (athlete / daily)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="diet" className="text-zinc-300">Diet pattern</Label>
        <Input
          id="diet"
          required
          value={values.diet_pattern}
          onChange={(e) => onChange({ diet_pattern: e.target.value })}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="e.g. balanced, vegetarian, low-carb"
        />
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <div className="flex gap-3">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          ← Back
        </Button>
        <Button type="submit" className="flex-1" disabled={loading}>
          {loading ? 'Calculating…' : 'See my plan →'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Create `frontend/app/funnel/start/page.tsx`**

```tsx
import { FunnelOnboarding } from './components/funnel-onboarding'

export default function FunnelStartPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white">Build your plan</h1>
          <p className="text-zinc-500 text-sm mt-1">3 quick questions · No account needed yet</p>
        </div>
        <FunnelOnboarding />
      </div>
    </main>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/funnel/start/
git commit -m "feat: add /funnel/start anonymous 3-step onboarding form"
```

---

### Task 15: Preview Components + `/funnel/preview`

**Files:**
- Create: `frontend/app/funnel/preview/components/plan-preview-card.tsx`
- Create: `frontend/app/funnel/preview/components/locked-plan-preview.tsx`
- Create: `frontend/app/funnel/preview/components/countdown-timer.tsx`
- Create: `frontend/app/funnel/preview/page.tsx`

- [ ] **Step 1: Create `frontend/app/funnel/preview/components/plan-preview-card.tsx`**

```tsx
import type { FunnelPreview } from '@/lib/funnel-session'

export function PlanPreviewCard({ preview }: { preview: FunnelPreview }) {
  const macros = [
    { label: 'Protein', grams: preview.protein_g, pct: 30, color: 'bg-blue-500' },
    { label: 'Carbs', grams: preview.carbs_g, pct: 40, color: 'bg-amber-500' },
    { label: 'Fat', grams: preview.fat_g, pct: 30, color: 'bg-rose-500' },
  ]

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-6">
      <div className="text-center">
        <p className="text-zinc-400 text-sm mb-1">Daily calorie target</p>
        <p className="text-5xl font-bold text-white">{preview.calories.toLocaleString()}</p>
        <p className="text-zinc-500 text-xs mt-1">kcal/day · {preview.deficit_rate} kcal deficit</p>
      </div>

      <div className="space-y-3">
        <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Macro split</p>
        <div className="flex gap-1 h-2 rounded-full overflow-hidden">
          {macros.map((m) => (
            <div key={m.label} className={`${m.color}`} style={{ width: `${m.pct}%` }} />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {macros.map((m) => (
            <div key={m.label} className="text-center">
              <p className="text-white font-semibold text-lg">{m.grams}g</p>
              <p className="text-zinc-500 text-xs">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-zinc-800 rounded-xl p-4 text-center">
        <p className="text-zinc-400 text-xs">Estimated weekly loss</p>
        <p className="text-emerald-400 font-bold text-xl mt-1">
          ~{preview.weekly_loss_kg_estimate} kg/week
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/app/funnel/preview/components/locked-plan-preview.tsx`**

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

const LOCKED_ITEMS = ['7-day meal plan', 'Weekly workout schedule', 'AI coaching insights']

export function LockedPlanPreview() {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
      <p className="text-zinc-400 text-xs font-medium uppercase tracking-wide">Pro features</p>
      <div className="space-y-3">
        {LOCKED_ITEMS.map((item) => (
          <div key={item} className="flex items-center gap-3 relative">
            <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center flex-shrink-0">
              <span className="text-xs">🔒</span>
            </div>
            <div className="blur-sm select-none flex-1 bg-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-400">
              {item}
            </div>
          </div>
        ))}
      </div>
      <Button asChild className="w-full mt-2">
        <Link href="/funnel/upgrade">Unlock your full plan →</Link>
      </Button>
      <p className="text-center text-zinc-600 text-xs">7-day free trial · $9/mo after · Cancel anytime</p>
    </div>
  )
}
```

- [ ] **Step 3: Create `frontend/app/funnel/preview/components/countdown-timer.tsx`**

```tsx
'use client'

import { useEffect, useState } from 'react'

const TIMER_KEY = '_funnel_timer_end'
const DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

function getOrInitEndTime(): number {
  const stored = sessionStorage.getItem(TIMER_KEY)
  if (stored) {
    const parsed = parseInt(stored, 10)
    if (!isNaN(parsed)) return parsed
  }
  const end = Date.now() + DURATION_MS
  sessionStorage.setItem(TIMER_KEY, String(end))
  return end
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '00:00'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function CountdownTimer() {
  const [remainingMs, setRemainingMs] = useState<number | null>(null)
  const expired = remainingMs !== null && remainingMs <= 0

  useEffect(() => {
    const endTime = getOrInitEndTime()
    setRemainingMs(endTime - Date.now())
    const interval = setInterval(() => {
      setRemainingMs(endTime - Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  if (remainingMs === null) return null

  return (
    <div className={`text-center text-sm ${expired ? 'text-amber-400' : 'text-zinc-500'}`}>
      {expired ? (
        <p className="font-medium">Your plan is ready — don&apos;t lose it</p>
      ) : (
        <p>
          Your session plan expires in{' '}
          <span className="font-mono font-semibold text-white">{formatRemaining(remainingMs)}</span>
        </p>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Create `frontend/app/funnel/preview/page.tsx`**

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { trackFunnelEvent } from '@/lib/analytics'
import { type FunnelPreview, fetchFunnelPreview, getFunnelProfile } from '@/lib/funnel-session'
import { CountdownTimer } from './components/countdown-timer'
import { LockedPlanPreview } from './components/locked-plan-preview'
import { PlanPreviewCard } from './components/plan-preview-card'

export default function FunnelPreviewPage() {
  const router = useRouter()
  const [preview, setPreview] = useState<FunnelPreview | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchFunnelPreview()
      .then((data) => {
        setPreview(data)
        trackFunnelEvent('preview_viewed')
      })
      .catch(() => {
        // No valid session — send back to start
        router.replace('/funnel/start')
      })
  }, [router])

  const profile = getFunnelProfile()
  const name = preview?.name ?? profile?.name ?? ''

  if (error) {
    return (
      <main className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <p className="text-red-400">{error}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="max-w-md mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {name ? `Here's ${name}'s metabolic baseline` : 'Your metabolic baseline'}
          </h1>
          {preview && name && (
            <p className="text-zinc-400 text-sm mt-1">
              {name}, to reach {preview.goal_weight_kg}kg in {preview.timeline_weeks} weeks, you need:
            </p>
          )}
        </div>

        {preview ? (
          <>
            <PlanPreviewCard preview={preview} />
            <CountdownTimer />
            <LockedPlanPreview />
          </>
        ) : (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-zinc-900 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 5: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add frontend/app/funnel/preview/
git commit -m "feat: add /funnel/preview page (calorie display, macro split, locked preview, countdown)"
```

---

### Task 16: Upgrade Form + `/funnel/upgrade`

**Files:**
- Create: `frontend/app/funnel/upgrade/components/value-recap.tsx`
- Create: `frontend/app/funnel/upgrade/components/upgrade-form.tsx`
- Create: `frontend/app/funnel/upgrade/page.tsx`

- [ ] **Step 1: Create `frontend/app/funnel/upgrade/components/value-recap.tsx`**

```tsx
import { TestimonialCard } from '../../components/social-proof/testimonial-card'

const UNLOCK_ITEMS = [
  '7-day personalised meal plan',
  'Weekly workout schedule',
  'AI coaching insights',
  'Unlimited plan regeneration',
]

export function ValueRecap({ name }: { name?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-white">
          {name ? `Unlock ${name}'s full plan` : 'Unlock your full plan'}
        </h2>
        <p className="text-zinc-400 text-sm mt-1">meals, schedule, and weekly coaching</p>
      </div>

      <ul className="space-y-2">
        {UNLOCK_ITEMS.map((item) => (
          <li key={item} className="flex items-center gap-3 text-zinc-300 text-sm">
            <span className="text-emerald-400">✓</span>
            {item}
          </li>
        ))}
      </ul>

      <TestimonialCard
        name="James T."
        result="Down 12kg in 14 weeks"
        quote="The macro split was the missing piece. I wasn't eating enough protein."
      />

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-white font-semibold text-lg">$9 / month</p>
        <p className="text-zinc-500 text-xs mt-1">Cancel anytime · 7-day free trial included</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `frontend/app/funnel/upgrade/components/upgrade-form.tsx`**

```tsx
'use client'

import { CardElement, Elements, useElements, useStripe } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { trackFunnelEvent } from '@/lib/analytics'
import { convertFunnelSession } from '@/lib/funnel-session'
import { getStripe } from '@/lib/stripe-client'
import { setAccessToken } from '@/lib/auth'

function CheckoutForm() {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setLoading(true)
    setError('')
    trackFunnelEvent('checkout_started')

    const cardElement = elements.getElement(CardElement)
    if (!cardElement) {
      setError('Card input not ready')
      setLoading(false)
      return
    }

    const { error: stripeError, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
      billing_details: { email },
    })

    if (stripeError || !paymentMethod) {
      setError(stripeError?.message ?? 'Card error')
      setLoading(false)
      return
    }

    try {
      const accessToken = await convertFunnelSession({
        email,
        password,
        paymentMethodId: paymentMethod.id,
      })
      setAccessToken(accessToken)
      router.replace('/funnel/welcome')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="email" className="text-zinc-300">Email</Label>
        <Input
          id="email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="you@example.com"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password" className="text-zinc-300">Password</Label>
        <Input
          id="password"
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="bg-zinc-900 border-zinc-700 text-white"
          placeholder="At least 8 characters"
        />
      </div>
      <div className="space-y-2">
        <Label className="text-zinc-300">Card details</Label>
        <div className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-3">
          <CardElement
            options={{
              style: {
                base: {
                  color: '#ffffff',
                  fontFamily: 'inherit',
                  fontSize: '15px',
                  '::placeholder': { color: '#71717a' },
                },
                invalid: { color: '#f87171' },
              },
            }}
          />
        </div>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
      <Button type="submit" className="w-full text-base py-4 h-auto" disabled={loading || !stripe}>
        {loading ? 'Processing…' : 'Start free week → $9/mo after'}
      </Button>
      <p className="text-center text-zinc-600 text-xs">
        Card charged after 7-day trial · Cancel anytime
      </p>
    </form>
  )
}

export function UpgradeForm() {
  return (
    <Elements stripe={getStripe()}>
      <CheckoutForm />
    </Elements>
  )
}
```

- [ ] **Step 3: Create `frontend/app/funnel/upgrade/page.tsx`**

```tsx
'use client'

import { trackFunnelEvent } from '@/lib/analytics'
import { getFunnelProfile } from '@/lib/funnel-session'
import { useEffect } from 'react'
import { UpgradeForm } from './components/upgrade-form'
import { ValueRecap } from './components/value-recap'

export default function FunnelUpgradePage() {
  const profile = getFunnelProfile()

  useEffect(() => {
    trackFunnelEvent('upgrade_clicked')
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
          <ValueRecap name={profile?.name} />
          <div>
            <h2 className="text-xl font-semibold text-white mb-6">Create your account</h2>
            <UpgradeForm />
          </div>
        </div>
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/funnel/upgrade/
git commit -m "feat: add /funnel/upgrade page with Stripe Elements checkout"
```

---

### Task 17: Welcome Page + Root Redirect

**Files:**
- Create: `frontend/app/funnel/welcome/page.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Create `frontend/app/funnel/welcome/page.tsx`**

```tsx
'use client'

import Link from 'next/link'
import { useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { trackFunnelEvent } from '@/lib/analytics'
import { clearFunnelSession, getFunnelProfile } from '@/lib/funnel-session'

export default function FunnelWelcomePage() {
  const profile = getFunnelProfile()

  useEffect(() => {
    trackFunnelEvent('conversion_completed')
    clearFunnelSession()
  }, [])

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4 text-center gap-8">
      <div className="space-y-3">
        <p className="text-5xl">🎉</p>
        <h1 className="text-3xl font-bold text-white">
          {profile?.name ? `You're in, ${profile.name}.` : "You're in."}
        </h1>
        <p className="text-zinc-400">Your full plan is ready.</p>
      </div>
      <Button asChild size="lg" className="text-base px-8 py-4 h-auto">
        <Link href="/dashboard">Go to your dashboard →</Link>
      </Button>
      <p className="text-zinc-600 text-xs">
        Your 7-day free trial has started · You&apos;ll be charged $9 after 7 days
      </p>
    </main>
  )
}
```

- [ ] **Step 2: Modify `frontend/app/page.tsx` to redirect unauthenticated users to `/funnel`**

Replace the entire file:

```tsx
'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { isLoggedIn } from '@/lib/auth'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    if (isLoggedIn()) {
      router.replace('/dashboard')
    } else {
      router.replace('/funnel')
    }
  }, [router])

  return null
}
```

- [ ] **Step 3: Verify TypeScript**

```
cd frontend && npx tsc --noEmit
```
Expected: no errors.

- [ ] **Step 4: Run frontend dev server and smoke-test the full flow manually**

```
cd backend && uvicorn app.main:app --reload --port 8000 &
cd frontend && npm run dev
```

Navigate: `http://localhost:3000` → should redirect to `/funnel` → click CTA → `/funnel/start` → fill form → `/funnel/preview` → see calorie target → click upgrade → `/funnel/upgrade` → (test with Stripe test card `4242 4242 4242 4242`) → `/funnel/welcome` → click dashboard → `/dashboard`.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/funnel/welcome/page.tsx frontend/app/page.tsx
git commit -m "feat: add /funnel/welcome page and root redirect (unauthenticated → /funnel)"
```

---

## Self-Review

### Spec Coverage Check

| Spec section | Covered by task |
|---|---|
| Route tree `/funnel`, `/funnel/start`, `/funnel/preview`, `/funnel/upgrade`, `/funnel/welcome` | Tasks 13–17 |
| `POST /funnel/sessions` | Task 7 |
| `GET /funnel/preview` | Task 7 |
| `POST /funnel/convert` (idempotent) | Task 7 |
| `POST /funnel/events` | Task 7 |
| `GET /funnel/stats` | Task 7 |
| `POST /funnel/stripe-webhook` | Task 7 |
| `anonymous_sessions` table | Tasks 1, 3 |
| `conversion_events` table | Tasks 1, 3 |
| `user_subscriptions` table | Tasks 1, 3 |
| BMR / TDEE / macro calc | Task 5 |
| Subscription access guard on `/plans/today` | Task 8 |
| A/B testing (headline + CTA variants) | Task 10 |
| Session-based countdown timer | Task 15 |
| Personalization (name injected into copy) | Tasks 15, 16 |
| `TestimonialCard`, `TransformationCard`, `PlanCounter` | Task 12 |
| Analytics event names (9 new events) | Task 9 |
| `trackFunnelEvent()` helper | Task 9 |
| Stripe Elements checkout | Task 16 |
| `funnel_session` httpOnly cookie | Task 7 |
| Root redirect unauthenticated → `/funnel` | Task 17 |
| Funnel layout (no nav bar) | Task 11 |
| Content engine templates | Operational docs — no code, out of scope for this plan |
| Env vars (STRIPE_*, AB_*) | Tasks 4, 11 |

**Gap:** The `.env.local` for the frontend is not created by this plan. The engineer must manually add:
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_LANDING_AB_ENABLED=true
NEXT_PUBLIC_LANDING_AB_ROLLOUT=50
```
And the backend `.env` must have `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRO_PRICE_ID`.

### Type Consistency Check

- `FunnelProfile` (defined in `funnel-session.ts`) is used by `FunnelOnboarding` and `ValueRecap` ✓
- `FunnelPreview` (defined in `funnel-session.ts`) is used by `PlanPreviewCard` ✓
- `FunnelVariants` (defined in `feature-flags.ts`) is used by `FunnelHero` ✓
- `AnalyticsEventName` union is extended in Task 9 before `trackFunnelEvent` is used in Tasks 13–17 ✓
- `UserSubscription` model (Task 1) is referenced in plans guard (Task 8) and funnel endpoints (Task 7) ✓

### No Placeholders Scan

All code blocks are complete. No "TBD", "TODO", or "similar to task N" patterns present.

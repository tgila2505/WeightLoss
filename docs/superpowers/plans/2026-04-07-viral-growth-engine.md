# Viral Growth Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete viral growth loop — referral codes, shareable plans, social sharing CTAs, dynamic OG images, a leaderboard, and attribution tracking — that drives measurable organic user acquisition.

**Architecture:** New SQLAlchemy models (`Referral`, `ReferralEvent`, `RewardLog`, `SharedPlan`) extend the existing Postgres schema via an Alembic autogenerate migration. Three new FastAPI endpoint modules (`referrals`, `shared_plans`, `leaderboard`) register under the existing `v1` router. The frontend adds share CTAs, a referral widget, a public plan page, a leaderboard page, and a dynamic OG image route handler; a Next.js route handler at `/referral/[code]` redirects to `/register?ref=CODE` so the registration page can store the code in `localStorage` and include it in the signup request body.

**Tech Stack:** FastAPI, SQLAlchemy 2 (`Mapped` style), Alembic, PostgreSQL, Next.js 15 App Router, React 19, Tailwind CSS, Radix UI, `next/og` (ImageResponse), PostHog

---

## File Map

### Backend — New
| File | Responsibility |
|------|---------------|
| `backend/app/models/referral.py` | `Referral`, `ReferralEvent`, `RewardLog` ORM models |
| `backend/app/models/shared_plan.py` | `SharedPlan` ORM model |
| `backend/app/schemas/referral.py` | Pydantic I/O schemas for referral endpoints |
| `backend/app/schemas/shared_plan.py` | Pydantic I/O schemas for shared-plan endpoints |
| `backend/app/schemas/leaderboard.py` | Pydantic schema for leaderboard response |
| `backend/app/services/referral_service.py` | Referral CRUD, code generation, click tracking |
| `backend/app/services/reward_service.py` | Idempotent premium-day reward distribution |
| `backend/app/services/shared_plan_service.py` | SharedPlan CRUD, slug generation, sanitisation |
| `backend/app/api/v1/endpoints/referrals.py` | REST endpoints: generate, track, assign, stats, conversion |
| `backend/app/api/v1/endpoints/shared_plans.py` | REST endpoints: create, get (public), list, delete |
| `backend/app/api/v1/endpoints/leaderboard.py` | REST endpoint: top weight-loss leaderboard |
| `backend/tests/services/test_referral_service.py` | Unit tests for referral service |
| `backend/tests/services/test_reward_service.py` | Unit tests for reward service |
| `backend/tests/services/test_shared_plan_service.py` | Unit tests for shared-plan service |

### Backend — Modified
| File | Change |
|------|--------|
| `backend/app/models/user.py` | Add `premium_until`, `leaderboard_opt_in`, `referral`, `shared_plans` |
| `backend/app/models/__init__.py` | Export `Referral`, `ReferralEvent`, `RewardLog`, `SharedPlan` |
| `backend/app/api/v1/router.py` | Include 3 new endpoint routers |
| `backend/app/schemas/auth.py` | Add `ref_code: str \| None = None` to `RegisterRequest` |
| `backend/app/api/v1/endpoints/auth.py` | Post-signup referral assignment + reward |
| `backend/tests/support.py` | Import new model modules so SQLite creates their tables |

### Frontend — New
| File | Responsibility |
|------|---------------|
| `frontend/hooks/useReferral.ts` | Fetch/generate referral link + stats |
| `frontend/hooks/useSharePlan.ts` | Create shareable plan link |
| `frontend/components/sharing/ShareButton.tsx` | 1-click share CTA button |
| `frontend/components/sharing/ReferralWidget.tsx` | Referral stats + link widget |
| `frontend/app/referral/[code]/route.ts` | Route handler: track click, redirect to `/register?ref=CODE` |
| `frontend/app/shared-plan/[slug]/page.tsx` | Public plan view (no auth required) |
| `frontend/app/leaderboard/page.tsx` | Opt-in leaderboard page |
| `frontend/app/api/og/[slug]/route.tsx` | Dynamic OG image for shared plans |
| `Documentation/Viral-Growth-System.md` | Architecture + rules documentation |

### Frontend — Modified
| File | Change |
|------|--------|
| `frontend/app/register/page.tsx` | On mount, read `?ref` param and store in `localStorage` |
| `frontend/app/plan/page.tsx` | Add `<ShareButton>` after plan display |
| `frontend/app/dashboard/page.tsx` | Add `<ReferralWidget>` to dashboard layout |

---

## Task 1: Backend referral + reward + shared-plan models

**Files:**
- Create: `backend/app/models/referral.py`
- Create: `backend/app/models/shared_plan.py`

- [ ] **Step 1.1: Write the referral model file**

```python
# backend/app/models/referral.py
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Integer,
    JSON,
    String,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ReferralEventType(str, enum.Enum):
    CLICK = "click"
    SIGNUP = "signup"
    PAID_CONVERSION = "paid_conversion"


class RewardType(str, enum.Enum):
    PREMIUM_DAYS = "premium_days"


class RewardStatus(str, enum.Enum):
    APPLIED = "applied"
    REVOKED = "revoked"


class Referral(Base):
    __tablename__ = "referrals"

    id: Mapped[int] = mapped_column(primary_key=True)
    referrer_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    code: Mapped[str] = mapped_column(String(12), unique=True, nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    referrer: Mapped["User"] = relationship(
        "User", back_populates="referral", foreign_keys=[referrer_user_id]
    )
    events: Mapped[list["ReferralEvent"]] = relationship(
        "ReferralEvent", back_populates="referral", cascade="all, delete-orphan"
    )


class ReferralEvent(Base):
    __tablename__ = "referral_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    referral_id: Mapped[int] = mapped_column(
        ForeignKey("referrals.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[ReferralEventType] = mapped_column(
        SAEnum(ReferralEventType, native_enum=False), nullable=False
    )
    referred_user_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    ip_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    event_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    referral: Mapped["Referral"] = relationship("Referral", back_populates="events")
    referred_user: Mapped["User | None"] = relationship(
        "User", foreign_keys=[referred_user_id]
    )


class RewardLog(Base):
    __tablename__ = "reward_logs"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    referral_event_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("referral_events.id", ondelete="SET NULL"),
        nullable=True,
        unique=True,  # one reward row per referral event — prevents double-reward
    )
    reward_type: Mapped[RewardType] = mapped_column(
        SAEnum(RewardType, native_enum=False), nullable=False
    )
    reward_value: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[RewardStatus] = mapped_column(
        SAEnum(RewardStatus, native_enum=False),
        nullable=False,
        default=RewardStatus.APPLIED,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 1.2: Write the shared plan model file**

```python
# backend/app/models/shared_plan.py
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, JSON, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SharedPlan(Base):
    __tablename__ = "shared_plans"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    slug: Mapped[str] = mapped_column(String(16), unique=True, nullable=False, index=True)
    plan_data: Mapped[dict] = mapped_column(JSON, nullable=False)
    views: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    user: Mapped["User"] = relationship("User", back_populates="shared_plans")
```

- [ ] **Step 1.3: Verify both files parse without error**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -c "from app.models.referral import Referral, ReferralEvent, RewardLog; print('OK')"
python -c "from app.models.shared_plan import SharedPlan; print('OK')"
```

Expected: `OK` on both lines.

- [ ] **Step 1.4: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/models/referral.py backend/app/models/shared_plan.py
git commit -m "feat(models): add Referral, ReferralEvent, RewardLog, SharedPlan models"
```

---

## Task 2: Extend User model + update models `__init__`

**Files:**
- Modify: `backend/app/models/user.py`
- Modify: `backend/app/models/__init__.py`

- [ ] **Step 2.1: Add columns + relationships to User**

In `backend/app/models/user.py`, add these imports at the top:

```python
from sqlalchemy import Boolean, DateTime, Numeric, String, func  # Boolean already may be present — check
```

Then add these columns after the existing `plan_refresh_needed` column:

```python
    premium_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    leaderboard_opt_in: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False
    )
```

Then add these relationships after the existing `master_profile` relationship:

```python
    referral: Mapped["Referral | None"] = relationship(
        "Referral",
        back_populates="referrer",
        foreign_keys="Referral.referrer_user_id",
        uselist=False,
        cascade="all, delete-orphan",
    )
    shared_plans: Mapped[list["SharedPlan"]] = relationship(
        "SharedPlan", back_populates="user", cascade="all, delete-orphan"
    )
```

- [ ] **Step 2.2: Export new models from `__init__.py`**

Replace the contents of `backend/app/models/__init__.py` with:

```python
"""ORM model package."""

from app.db.base import Base
from app.models.adherence import AdherenceRecord
from app.models.analytics import AnalyticsEvent
from app.models.behavior_tracking import BehaviorTracking
from app.models.experiment import ExperimentAssignment
from app.models.funnel import AnonymousSession, ConversionEvent, UserSubscription
from app.models.health_metrics import HealthMetrics
from app.models.lab import LabRecord
from app.models.plan import Plan
from app.models.profile import Profile
from app.models.questionnaire import MasterUserProfile, QuestionnaireResponse
from app.models.referral import Referral, ReferralEvent, RewardLog
from app.models.refresh_token import RefreshToken
from app.models.reminder import Reminder
from app.models.shared_plan import SharedPlan
from app.models.user import User

__all__ = [
    "Base",
    "AdherenceRecord",
    "AnalyticsEvent",
    "AnonymousSession",
    "BehaviorTracking",
    "ConversionEvent",
    "ExperimentAssignment",
    "HealthMetrics",
    "LabRecord",
    "MasterUserProfile",
    "Plan",
    "Profile",
    "QuestionnaireResponse",
    "Referral",
    "ReferralEvent",
    "RefreshToken",
    "Reminder",
    "RewardLog",
    "SharedPlan",
    "User",
    "UserSubscription",
]
```

- [ ] **Step 2.3: Verify User model parses correctly**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -c "from app.models import Referral, SharedPlan, RewardLog, User; print('OK')"
```

Expected: `OK`

- [ ] **Step 2.4: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/models/user.py backend/app/models/__init__.py
git commit -m "feat(models): add premium_until, leaderboard_opt_in to User; export viral growth models"
```

---

## Task 3: Alembic migration

**Files:**
- Create: `backend/alembic/versions/<generated>_add_viral_growth_tables.py`

- [ ] **Step 3.1: Copy `.env` into worktree if not present**

```bash
ls D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend/.env 2>/dev/null || \
  cp D:/WeightLoss/backend/.env D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend/.env
```

- [ ] **Step 3.2: Generate migration**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
alembic revision --autogenerate -m "add_viral_growth_tables"
```

Expected: a new file created at `alembic/versions/<hash>_add_viral_growth_tables.py`.

- [ ] **Step 3.3: Verify the generated migration adds the correct tables**

Open the generated file and confirm it contains `op.create_table("referrals", ...)`, `op.create_table("referral_events", ...)`, `op.create_table("reward_logs", ...)`, `op.create_table("shared_plans", ...)`, and `op.add_column("users", ...)` for `premium_until` and `leaderboard_opt_in`.

If any table is missing, add it manually following SQLAlchemy's migration format:

```python
# Example for referrals table if autogenerate misses it:
op.create_table(
    "referrals",
    sa.Column("id", sa.Integer(), nullable=False),
    sa.Column("referrer_user_id", sa.Integer(), nullable=False),
    sa.Column("code", sa.String(12), nullable=False),
    sa.Column("is_active", sa.Boolean(), nullable=False),
    sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    sa.ForeignKeyConstraint(["referrer_user_id"], ["users.id"], ondelete="CASCADE"),
    sa.PrimaryKeyConstraint("id"),
)
op.create_index("ix_referrals_code", "referrals", ["code"], unique=True)
op.create_index("ix_referrals_referrer_user_id", "referrals", ["referrer_user_id"])
```

- [ ] **Step 3.4: Apply migration**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
alembic upgrade head
```

Expected: `Running upgrade <prev> -> <new>, add_viral_growth_tables`

- [ ] **Step 3.5: Commit migration file**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/alembic/versions/
git commit -m "feat(migrations): add viral growth tables (referrals, referral_events, reward_logs, shared_plans)"
```

---

## Task 4: Pydantic schemas

**Files:**
- Create: `backend/app/schemas/referral.py`
- Create: `backend/app/schemas/shared_plan.py`
- Create: `backend/app/schemas/leaderboard.py`

- [ ] **Step 4.1: Write referral schemas**

```python
# backend/app/schemas/referral.py
from datetime import datetime

from pydantic import BaseModel

from app.models.referral import RewardStatus, RewardType


class ReferralOut(BaseModel):
    code: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ReferralStatsOut(BaseModel):
    code: str | None
    clicks: int
    signups: int
    conversions: int
    rewards_earned: int
    premium_until: datetime | None


class TrackClickOut(BaseModel):
    tracked: bool


class RewardLogOut(BaseModel):
    reward_type: RewardType
    reward_value: int
    status: RewardStatus
    created_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 4.2: Write shared plan schemas**

```python
# backend/app/schemas/shared_plan.py
from datetime import datetime

from pydantic import BaseModel


class SharedPlanCreate(BaseModel):
    plan_data: dict


class SharedPlanOut(BaseModel):
    slug: str
    plan_data: dict
    views: int
    created_at: datetime
    expires_at: datetime | None

    model_config = {"from_attributes": True}


class SharedPlanListItem(BaseModel):
    slug: str
    views: int
    created_at: datetime
    expires_at: datetime | None
    is_active: bool

    model_config = {"from_attributes": True}
```

- [ ] **Step 4.3: Write leaderboard schema**

```python
# backend/app/schemas/leaderboard.py
from pydantic import BaseModel


class LeaderboardEntry(BaseModel):
    rank: int
    username: str         # first 2 chars of email + "***"
    weight_lost_kg: float
    weeks_tracked: int


class LeaderboardOut(BaseModel):
    entries: list[LeaderboardEntry]
    total_opted_in: int
```

- [ ] **Step 4.4: Verify schemas import cleanly**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -c "from app.schemas.referral import ReferralOut, ReferralStatsOut; from app.schemas.shared_plan import SharedPlanOut; from app.schemas.leaderboard import LeaderboardOut; print('OK')"
```

Expected: `OK`

- [ ] **Step 4.5: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/schemas/referral.py backend/app/schemas/shared_plan.py backend/app/schemas/leaderboard.py
git commit -m "feat(schemas): add referral, shared_plan, leaderboard Pydantic schemas"
```

---

## Task 5: Referral service

**Files:**
- Create: `backend/app/services/referral_service.py`

- [ ] **Step 5.1: Write failing tests first**

```python
# backend/tests/services/test_referral_service.py
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.referral  # noqa: F401
import app.models.shared_plan  # noqa: F401
import app.models.user  # noqa: F401
from app.db.base import Base
from app.models.user import User


def _make_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    factory = sessionmaker(bind=engine, class_=Session)
    return factory()


def _create_user(session: Session, email: str) -> User:
    user = User(email=email, full_name="Test", hashed_password="x")
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


class TestReferralService(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _make_session()
        self.alice = _create_user(self.session, "alice@test.com")

    def test_get_or_create_referral_creates_eight_char_code(self) -> None:
        from app.services.referral_service import get_or_create_referral

        ref = get_or_create_referral(self.session, self.alice.id)
        self.assertEqual(len(ref.code), 8)
        self.assertEqual(ref.referrer_user_id, self.alice.id)

    def test_get_or_create_referral_is_idempotent(self) -> None:
        from app.services.referral_service import get_or_create_referral

        r1 = get_or_create_referral(self.session, self.alice.id)
        r2 = get_or_create_referral(self.session, self.alice.id)
        self.assertEqual(r1.id, r2.id)
        self.assertEqual(r1.code, r2.code)

    def test_get_referral_by_code_case_insensitive(self) -> None:
        from app.services.referral_service import get_or_create_referral, get_referral_by_code

        ref = get_or_create_referral(self.session, self.alice.id)
        found = get_referral_by_code(self.session, ref.code.lower())
        self.assertIsNotNone(found)
        self.assertEqual(found.id, ref.id)  # type: ignore[union-attr]

    def test_get_referral_by_code_returns_none_for_unknown(self) -> None:
        from app.services.referral_service import get_referral_by_code

        self.assertIsNone(get_referral_by_code(self.session, "ZZZZZZZZ"))

    def test_assign_referral_records_signup_event(self) -> None:
        from app.services.referral_service import assign_referral_to_user, get_or_create_referral

        bob = _create_user(self.session, "bob@test.com")
        ref = get_or_create_referral(self.session, self.alice.id)
        event = assign_referral_to_user(self.session, ref, bob.id)
        self.assertIsNotNone(event)
        self.assertEqual(event.referred_user_id, bob.id)  # type: ignore[union-attr]

    def test_assign_referral_prevents_self_referral(self) -> None:
        from app.services.referral_service import assign_referral_to_user, get_or_create_referral

        ref = get_or_create_referral(self.session, self.alice.id)
        event = assign_referral_to_user(self.session, ref, self.alice.id)
        self.assertIsNone(event)

    def test_assign_referral_is_idempotent(self) -> None:
        from app.services.referral_service import assign_referral_to_user, get_or_create_referral

        bob = _create_user(self.session, "bob2@test.com")
        ref = get_or_create_referral(self.session, self.alice.id)
        e1 = assign_referral_to_user(self.session, ref, bob.id)
        e2 = assign_referral_to_user(self.session, ref, bob.id)
        self.assertEqual(e1.id, e2.id)  # type: ignore[union-attr]

    def test_get_referral_stats_before_referral_created(self) -> None:
        from app.services.referral_service import get_referral_stats

        stats = get_referral_stats(self.session, self.alice.id)
        self.assertIsNone(stats["code"])
        self.assertEqual(stats["clicks"], 0)

    def test_get_referral_stats_counts_correctly(self) -> None:
        from app.services.referral_service import (
            assign_referral_to_user,
            get_or_create_referral,
            get_referral_stats,
            track_referral_click,
        )

        bob = _create_user(self.session, "bob3@test.com")
        ref = get_or_create_referral(self.session, self.alice.id)
        track_referral_click(self.session, ref, "1.2.3.4")
        assign_referral_to_user(self.session, ref, bob.id)

        stats = get_referral_stats(self.session, self.alice.id)
        self.assertEqual(stats["clicks"], 1)
        self.assertEqual(stats["signups"], 1)
        self.assertEqual(stats["conversions"], 0)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 5.2: Run tests and confirm they fail**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/services/test_referral_service.py -v 2>&1 | head -30
```

Expected: `ImportError: cannot import name 'get_or_create_referral' from 'app.services.referral_service'` (module doesn't exist yet).

- [ ] **Step 5.3: Write the referral service**

```python
# backend/app/services/referral_service.py
import secrets
from datetime import UTC, datetime, timedelta
from hashlib import sha256

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.referral import Referral, ReferralEvent, ReferralEventType

_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # no confusable chars (0/O, 1/I/L)


def _generate_code() -> str:
    return "".join(secrets.choice(_CODE_CHARS) for _ in range(8))


def get_or_create_referral(session: Session, user_id: int) -> Referral:
    """Return the user's active referral, creating one if it doesn't exist."""
    existing = session.scalar(
        select(Referral).where(
            Referral.referrer_user_id == user_id,
            Referral.is_active.is_(True),
        )
    )
    if existing:
        return existing

    for _ in range(10):
        code = _generate_code()
        if not session.scalar(select(Referral).where(Referral.code == code)):
            break

    referral = Referral(referrer_user_id=user_id, code=code)
    session.add(referral)
    session.commit()
    session.refresh(referral)
    return referral


def get_referral_by_code(session: Session, code: str) -> Referral | None:
    return session.scalar(
        select(Referral).where(
            Referral.code == code.upper(),
            Referral.is_active.is_(True),
        )
    )


def track_referral_click(session: Session, referral: Referral, ip: str) -> ReferralEvent:
    """Record a click; deduplicate the same IP within 1 hour."""
    ip_hash = sha256(ip.encode()).hexdigest()
    cutoff = datetime.now(UTC) - timedelta(hours=1)

    existing = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referral_id == referral.id,
            ReferralEvent.event_type == ReferralEventType.CLICK,
            ReferralEvent.ip_hash == ip_hash,
            ReferralEvent.created_at >= cutoff,
        )
    )
    if existing:
        return existing

    event = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.CLICK,
        ip_hash=ip_hash,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def assign_referral_to_user(
    session: Session, referral: Referral, referred_user_id: int
) -> ReferralEvent | None:
    """Record a signup via referral. Returns None for self-referral or duplicate."""
    if referral.referrer_user_id == referred_user_id:
        return None

    existing = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referral_id == referral.id,
            ReferralEvent.referred_user_id == referred_user_id,
            ReferralEvent.event_type == ReferralEventType.SIGNUP,
        )
    )
    if existing:
        return existing

    event = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.SIGNUP,
        referred_user_id=referred_user_id,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def record_paid_conversion(
    session: Session, referral: Referral, referred_user_id: int
) -> ReferralEvent | None:
    """Record a paid conversion. Idempotent."""
    existing = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referral_id == referral.id,
            ReferralEvent.referred_user_id == referred_user_id,
            ReferralEvent.event_type == ReferralEventType.PAID_CONVERSION,
        )
    )
    if existing:
        return existing

    event = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.PAID_CONVERSION,
        referred_user_id=referred_user_id,
    )
    session.add(event)
    session.commit()
    session.refresh(event)
    return event


def get_referral_by_referred_user(session: Session, user_id: int) -> Referral | None:
    """Return the referral that brought this user in (via their signup event)."""
    event = session.scalar(
        select(ReferralEvent).where(
            ReferralEvent.referred_user_id == user_id,
            ReferralEvent.event_type == ReferralEventType.SIGNUP,
        )
    )
    if not event:
        return None
    return session.get(Referral, event.referral_id)


def get_referral_stats(session: Session, user_id: int) -> dict:
    from app.models.referral import RewardLog
    from app.models.user import User

    referral = session.scalar(
        select(Referral).where(
            Referral.referrer_user_id == user_id,
            Referral.is_active.is_(True),
        )
    )
    user = session.get(User, user_id)
    premium_until = user.premium_until if user else None

    if not referral:
        return {
            "code": None,
            "clicks": 0,
            "signups": 0,
            "conversions": 0,
            "rewards_earned": 0,
            "premium_until": premium_until,
        }

    def _count(event_type: ReferralEventType) -> int:
        from sqlalchemy import func as sqlfunc

        return session.scalar(
            select(sqlfunc.count()).where(
                ReferralEvent.referral_id == referral.id,
                ReferralEvent.event_type == event_type,
            )
        ) or 0

    rewards_earned = session.scalar(
        select(__import__("sqlalchemy", fromlist=["func"]).func.count()).select_from(RewardLog).where(
            RewardLog.user_id == user_id
        )
    ) or 0

    return {
        "code": referral.code,
        "clicks": _count(ReferralEventType.CLICK),
        "signups": _count(ReferralEventType.SIGNUP),
        "conversions": _count(ReferralEventType.PAID_CONVERSION),
        "rewards_earned": rewards_earned,
        "premium_until": premium_until,
    }
```

- [ ] **Step 5.4: Run tests and confirm they pass**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/services/test_referral_service.py -v
```

Expected: all 9 tests `PASSED`.

- [ ] **Step 5.5: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/services/referral_service.py backend/tests/services/test_referral_service.py
git commit -m "feat(services): add referral_service with code generation, click tracking, attribution"
```

---

## Task 6: Reward service

**Files:**
- Create: `backend/app/services/reward_service.py`
- Create: `backend/tests/services/test_reward_service.py`

- [ ] **Step 6.1: Write failing tests**

```python
# backend/tests/services/test_reward_service.py
import sys
import unittest
from datetime import UTC, datetime, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.referral  # noqa: F401
import app.models.shared_plan  # noqa: F401
import app.models.user  # noqa: F401
from app.db.base import Base
from app.models.referral import Referral, ReferralEvent, ReferralEventType
from app.models.user import User


def _make_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, class_=Session)()


def _user(session: Session, email: str) -> User:
    u = User(email=email, full_name="T", hashed_password="x")
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


def _referral(session: Session, referrer_id: int) -> Referral:
    ref = Referral(referrer_user_id=referrer_id, code="TESTCODE")
    session.add(ref)
    session.commit()
    session.refresh(ref)
    return ref


def _signup_event(session: Session, referral: Referral, referred_id: int) -> ReferralEvent:
    ev = ReferralEvent(
        referral_id=referral.id,
        event_type=ReferralEventType.SIGNUP,
        referred_user_id=referred_id,
    )
    session.add(ev)
    session.commit()
    session.refresh(ev)
    return ev


class TestRewardService(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _make_session()
        self.alice = _user(self.session, "alice@r.com")
        self.bob = _user(self.session, "bob@r.com")
        self.referral = _referral(self.session, self.alice.id)

    def test_apply_signup_reward_grants_7_premium_days(self) -> None:
        from app.services.reward_service import apply_signup_reward

        before = datetime.now(UTC)
        apply_signup_reward(self.session, self.bob.id, referral_event_id=None)
        self.session.refresh(self.bob)

        self.assertIsNotNone(self.bob.premium_until)
        delta = self.bob.premium_until - before  # type: ignore[operator]
        self.assertGreaterEqual(delta.days, 6)  # at least 6 days ahead

    def test_apply_conversion_reward_grants_7_days_to_referrer(self) -> None:
        from app.services.reward_service import apply_conversion_reward

        ev = _signup_event(self.session, self.referral, self.bob.id)
        apply_conversion_reward(self.session, self.referral, ev)
        self.session.refresh(self.alice)

        self.assertIsNotNone(self.alice.premium_until)
        self.assertGreater(self.alice.premium_until, datetime.now(UTC))  # type: ignore[operator]

    def test_apply_conversion_reward_is_idempotent(self) -> None:
        from app.services.reward_service import apply_conversion_reward
        from app.models.referral import RewardLog
        from sqlalchemy import select, func

        ev = _signup_event(self.session, self.referral, self.bob.id)
        apply_conversion_reward(self.session, self.referral, ev)
        apply_conversion_reward(self.session, self.referral, ev)

        count = self.session.scalar(
            select(func.count()).select_from(RewardLog).where(
                RewardLog.referral_event_id == ev.id
            )
        )
        self.assertEqual(count, 1)

    def test_apply_conversion_reward_caps_at_20_per_month(self) -> None:
        from app.services.reward_service import apply_conversion_reward

        users = []
        for i in range(21):
            u = _user(self.session, f"user{i}@r.com")
            users.append(u)
            ev = _signup_event(self.session, self.referral, u.id)
            apply_conversion_reward(self.session, self.referral, ev)

        from app.models.referral import RewardLog
        from sqlalchemy import select, func

        count = self.session.scalar(
            select(func.count()).select_from(RewardLog).where(
                RewardLog.user_id == self.alice.id
            )
        )
        self.assertEqual(count, 20)  # capped at 20


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 6.2: Run tests and confirm they fail**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/services/test_reward_service.py -v 2>&1 | head -20
```

Expected: `ImportError` (module doesn't exist yet).

- [ ] **Step 6.3: Write the reward service**

```python
# backend/app/services/reward_service.py
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.referral import Referral, ReferralEvent, RewardLog, RewardStatus, RewardType

_REFERRED_PREMIUM_DAYS = 7
_REFERRER_PREMIUM_DAYS = 7
_MAX_MONTHLY_REWARDS = 20


def _extend_premium(user, days: int) -> None:
    """Extend user.premium_until by `days` from now (or from current premium_until if later)."""
    now = datetime.now(UTC)
    base = user.premium_until if (user.premium_until and user.premium_until > now) else now
    user.premium_until = base + timedelta(days=days)


def apply_signup_reward(
    session: Session, referred_user_id: int, referral_event_id: int | None
) -> None:
    """Grant 7 free premium days to a newly referred user. Idempotent."""
    from app.models.user import User

    if referral_event_id is not None:
        existing = session.scalar(
            select(RewardLog).where(RewardLog.referral_event_id == referral_event_id)
        )
        if existing:
            return

    user = session.get(User, referred_user_id)
    if not user:
        return

    _extend_premium(user, _REFERRED_PREMIUM_DAYS)

    reward = RewardLog(
        user_id=referred_user_id,
        referral_event_id=referral_event_id,
        reward_type=RewardType.PREMIUM_DAYS,
        reward_value=_REFERRED_PREMIUM_DAYS,
        status=RewardStatus.APPLIED,
    )
    session.add(reward)
    session.commit()


def apply_conversion_reward(
    session: Session, referral: Referral, referral_event: ReferralEvent
) -> None:
    """Grant 7 premium days to the referrer when a referred user pays. Idempotent + capped."""
    from app.models.user import User

    existing = session.scalar(
        select(RewardLog).where(RewardLog.referral_event_id == referral_event.id)
    )
    if existing:
        return

    now = datetime.now(UTC)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    monthly_count = session.scalar(
        select(func.count())
        .select_from(RewardLog)
        .where(
            RewardLog.user_id == referral.referrer_user_id,
            RewardLog.reward_type == RewardType.PREMIUM_DAYS,
            RewardLog.created_at >= month_start,
        )
    ) or 0

    if monthly_count >= _MAX_MONTHLY_REWARDS:
        return

    user = session.get(User, referral.referrer_user_id)
    if not user:
        return

    _extend_premium(user, _REFERRER_PREMIUM_DAYS)

    reward = RewardLog(
        user_id=referral.referrer_user_id,
        referral_event_id=referral_event.id,
        reward_type=RewardType.PREMIUM_DAYS,
        reward_value=_REFERRER_PREMIUM_DAYS,
        status=RewardStatus.APPLIED,
    )
    session.add(reward)
    session.commit()
```

- [ ] **Step 6.4: Run tests and confirm they pass**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/services/test_reward_service.py -v
```

Expected: all 4 tests `PASSED`.

- [ ] **Step 6.5: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/services/reward_service.py backend/tests/services/test_reward_service.py
git commit -m "feat(services): add reward_service with idempotent premium-day distribution + monthly cap"
```

---

## Task 7: Shared plan service

**Files:**
- Create: `backend/app/services/shared_plan_service.py`
- Create: `backend/tests/services/test_shared_plan_service.py`

- [ ] **Step 7.1: Write failing tests**

```python
# backend/tests/services/test_shared_plan_service.py
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.models.referral  # noqa: F401
import app.models.shared_plan  # noqa: F401
import app.models.user  # noqa: F401
from app.db.base import Base
from app.models.user import User


def _make_session() -> Session:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    return sessionmaker(bind=engine, class_=Session)()


def _user(session: Session) -> User:
    u = User(email="alice@sp.com", full_name="Alice", hashed_password="x")
    session.add(u)
    session.commit()
    session.refresh(u)
    return u


_PLAN = {
    "goal": "lose_weight",
    "calories_per_day": 1800,
    "protein_g": 150,
    "carbs_g": 180,
    "fat_g": 60,
    "timeline_weeks": 12,
    "user_name": "Should be stripped",
    "email": "also@stripped.com",
}


class TestSharedPlanService(unittest.TestCase):
    def setUp(self) -> None:
        self.session = _make_session()
        self.user = _user(self.session)

    def test_create_shared_plan_returns_slug(self) -> None:
        from app.services.shared_plan_service import create_shared_plan

        sp = create_shared_plan(self.session, self.user.id, _PLAN)
        self.assertEqual(len(sp.slug), 12)
        self.assertIsNotNone(sp.expires_at)

    def test_create_shared_plan_strips_pii(self) -> None:
        from app.services.shared_plan_service import create_shared_plan

        sp = create_shared_plan(self.session, self.user.id, _PLAN)
        self.assertNotIn("user_name", sp.plan_data)
        self.assertNotIn("email", sp.plan_data)
        self.assertIn("calories_per_day", sp.plan_data)

    def test_get_shared_plan_increments_views(self) -> None:
        from app.services.shared_plan_service import create_shared_plan, get_shared_plan

        sp = create_shared_plan(self.session, self.user.id, _PLAN)
        slug = sp.slug
        get_shared_plan(self.session, slug)
        get_shared_plan(self.session, slug)
        self.session.refresh(sp)
        self.assertEqual(sp.views, 2)

    def test_get_shared_plan_returns_none_for_unknown_slug(self) -> None:
        from app.services.shared_plan_service import get_shared_plan

        self.assertIsNone(get_shared_plan(self.session, "doesnotexist"))

    def test_deactivate_shared_plan(self) -> None:
        from app.services.shared_plan_service import (
            create_shared_plan,
            deactivate_shared_plan,
            get_shared_plan,
        )

        sp = create_shared_plan(self.session, self.user.id, _PLAN)
        result = deactivate_shared_plan(self.session, self.user.id, sp.slug)
        self.assertTrue(result)
        self.assertIsNone(get_shared_plan(self.session, sp.slug))

    def test_deactivate_shared_plan_wrong_user_returns_false(self) -> None:
        from app.services.shared_plan_service import create_shared_plan, deactivate_shared_plan

        sp = create_shared_plan(self.session, self.user.id, _PLAN)
        result = deactivate_shared_plan(self.session, 9999, sp.slug)
        self.assertFalse(result)


if __name__ == "__main__":
    unittest.main()
```

- [ ] **Step 7.2: Run tests and confirm they fail**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/services/test_shared_plan_service.py -v 2>&1 | head -20
```

Expected: `ImportError` (module doesn't exist yet).

- [ ] **Step 7.3: Write the shared plan service**

```python
# backend/app/services/shared_plan_service.py
import secrets
import string
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.shared_plan import SharedPlan

_SLUG_CHARS = string.ascii_lowercase + string.digits
_SLUG_LENGTH = 12
_EXPIRY_DAYS = 30

# Keys permitted in public plan data — all others are stripped to protect privacy
_ALLOWED_PLAN_KEYS = frozenset(
    {
        "goal",
        "timeline_weeks",
        "calories_per_day",
        "protein_g",
        "carbs_g",
        "fat_g",
        "meal_count",
        "activity_level",
        "weekly_loss_target_kg",
        "start_weight_kg",
        "target_weight_kg",
    }
)


def _sanitise(plan_data: dict) -> dict:
    return {k: v for k, v in plan_data.items() if k in _ALLOWED_PLAN_KEYS}


def _unique_slug(session: Session) -> str:
    for _ in range(10):
        slug = "".join(secrets.choice(_SLUG_CHARS) for _ in range(_SLUG_LENGTH))
        if not session.scalar(select(SharedPlan).where(SharedPlan.slug == slug)):
            return slug
    raise RuntimeError("Could not generate a unique slug after 10 attempts")


def create_shared_plan(session: Session, user_id: int, plan_data: dict) -> SharedPlan:
    slug = _unique_slug(session)
    sp = SharedPlan(
        user_id=user_id,
        slug=slug,
        plan_data=_sanitise(plan_data),
        expires_at=datetime.now(UTC) + timedelta(days=_EXPIRY_DAYS),
    )
    session.add(sp)
    session.commit()
    session.refresh(sp)
    return sp


def get_shared_plan(session: Session, slug: str) -> SharedPlan | None:
    sp = session.scalar(
        select(SharedPlan).where(SharedPlan.slug == slug, SharedPlan.is_active.is_(True))
    )
    if not sp:
        return None
    if sp.expires_at and sp.expires_at < datetime.now(UTC):
        sp.is_active = False
        session.commit()
        return None
    sp.views += 1
    session.commit()
    return sp


def get_user_shared_plans(session: Session, user_id: int) -> list[SharedPlan]:
    return list(
        session.scalars(
            select(SharedPlan)
            .where(SharedPlan.user_id == user_id, SharedPlan.is_active.is_(True))
            .order_by(SharedPlan.created_at.desc())
        )
    )


def deactivate_shared_plan(session: Session, user_id: int, slug: str) -> bool:
    sp = session.scalar(
        select(SharedPlan).where(SharedPlan.user_id == user_id, SharedPlan.slug == slug)
    )
    if not sp:
        return False
    sp.is_active = False
    session.commit()
    return True
```

- [ ] **Step 7.4: Run tests and confirm they pass**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/services/test_shared_plan_service.py -v
```

Expected: all 6 tests `PASSED`.

- [ ] **Step 7.5: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/services/shared_plan_service.py backend/tests/services/test_shared_plan_service.py
git commit -m "feat(services): add shared_plan_service with slug generation and PII stripping"
```

---

## Task 8: Referral REST endpoints

**Files:**
- Create: `backend/app/api/v1/endpoints/referrals.py`

- [ ] **Step 8.1: Write the referral endpoints**

```python
# backend/app/api/v1/endpoints/referrals.py
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.referral import ReferralOut, ReferralStatsOut, TrackClickOut
from app.services import referral_service, reward_service

router = APIRouter(prefix="/referrals")


@router.post("", response_model=ReferralOut, status_code=status.HTTP_200_OK)
def get_or_create_referral(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> ReferralOut:
    """Return the authenticated user's referral code, creating one if needed."""
    ref = referral_service.get_or_create_referral(session, current_user.id)
    return ReferralOut.model_validate(ref)


@router.get("/stats", response_model=ReferralStatsOut)
def get_referral_stats(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> ReferralStatsOut:
    stats = referral_service.get_referral_stats(session, current_user.id)
    return ReferralStatsOut(**stats)


@router.get("/track/{code}", response_model=TrackClickOut)
def track_click(
    code: str,
    request: Request,
    session: Session = Depends(get_db_session),
) -> TrackClickOut:
    """Record a referral link click. Called server-side by the `/referral/[code]` route handler."""
    ref = referral_service.get_referral_by_code(session, code)
    if not ref:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Referral code not found")
    ip = request.client.host if request.client else "unknown"
    referral_service.track_referral_click(session, ref, ip)
    return TrackClickOut(tracked=True)


@router.post("/conversion", status_code=status.HTTP_204_NO_CONTENT)
def record_conversion(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> Response:
    """
    Called after a successful Stripe payment to trigger the referrer's reward.
    Finds the referral that attributed this user and creates a PAID_CONVERSION event.
    """
    referral = referral_service.get_referral_by_referred_user(session, current_user.id)
    if not referral:
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    event = referral_service.record_paid_conversion(session, referral, current_user.id)
    if event:
        reward_service.apply_conversion_reward(session, referral, event)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
```

- [ ] **Step 8.2: Verify the file imports cleanly**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -c "from app.api.v1.endpoints.referrals import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 8.3: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/api/v1/endpoints/referrals.py
git commit -m "feat(api): add referral endpoints (generate, stats, track-click, conversion)"
```

---

## Task 9: Shared plan REST endpoints

**Files:**
- Create: `backend/app/api/v1/endpoints/shared_plans.py`

- [ ] **Step 9.1: Write the shared plan endpoints**

```python
# backend/app/api/v1/endpoints/shared_plans.py
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.shared_plan import SharedPlanCreate, SharedPlanListItem, SharedPlanOut
from app.services.shared_plan_service import (
    create_shared_plan,
    deactivate_shared_plan,
    get_shared_plan,
    get_user_shared_plans,
)

router = APIRouter(prefix="/shared-plans")


@router.post("", response_model=SharedPlanOut, status_code=status.HTTP_201_CREATED)
def create(
    payload: SharedPlanCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> SharedPlanOut:
    sp = create_shared_plan(session, current_user.id, payload.plan_data)
    return SharedPlanOut.model_validate(sp)


@router.get("/public/{slug}", response_model=SharedPlanOut)
def get_public(
    slug: str,
    session: Session = Depends(get_db_session),
) -> SharedPlanOut:
    """Public endpoint — no authentication required."""
    sp = get_shared_plan(session, slug)
    if not sp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Plan not found or expired")
    return SharedPlanOut.model_validate(sp)


@router.get("", response_model=list[SharedPlanListItem])
def list_mine(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> list[SharedPlanListItem]:
    plans = get_user_shared_plans(session, current_user.id)
    return [SharedPlanListItem.model_validate(p) for p in plans]


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
def delete(
    slug: str,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db_session),
) -> None:
    ok = deactivate_shared_plan(session, current_user.id, slug)
    if not ok:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared plan not found")
```

- [ ] **Step 9.2: Verify the file imports cleanly**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -c "from app.api.v1.endpoints.shared_plans import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 9.3: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/api/v1/endpoints/shared_plans.py
git commit -m "feat(api): add shared-plan endpoints (create, public-get, list, delete)"
```

---

## Task 10: Leaderboard REST endpoint

**Files:**
- Create: `backend/app/api/v1/endpoints/leaderboard.py`

- [ ] **Step 10.1: Write the leaderboard endpoint**

```python
# backend/app/api/v1/endpoints/leaderboard.py
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.models.health_metrics import HealthMetrics
from app.models.user import User
from app.schemas.leaderboard import LeaderboardEntry, LeaderboardOut

router = APIRouter(prefix="/leaderboard")

_TOP_N = 10


def _mask_email(email: str) -> str:
    """Return 'al***@***.com' style masked username."""
    local, _, domain = email.partition("@")
    masked_local = local[:2] + "***" if len(local) > 2 else local[0] + "***"
    domain_parts = domain.rsplit(".", 1)
    masked_domain = "***." + domain_parts[-1] if domain_parts else "***"
    return f"{masked_local}@{masked_domain}"


@router.get("", response_model=LeaderboardOut)
def get_leaderboard(session: Session = Depends(get_db_session)) -> LeaderboardOut:
    """
    Top users by weight lost. Only users who opted into leaderboard_opt_in=True are shown.
    Computes: earliest recorded weight_kg minus latest recorded weight_kg per user.
    """
    opted_in_ids = [
        row[0]
        for row in session.execute(
            select(User.id).where(User.leaderboard_opt_in.is_(True))
        )
    ]
    total_opted_in = len(opted_in_ids)

    if not opted_in_ids:
        return LeaderboardOut(entries=[], total_opted_in=0)

    # Earliest weight per user
    earliest_subq = (
        select(
            HealthMetrics.user_id,
            HealthMetrics.weight_kg.label("weight"),
            func.row_number()
            .over(
                partition_by=HealthMetrics.user_id,
                order_by=HealthMetrics.recorded_at.asc(),
            )
            .label("rn"),
        )
        .where(HealthMetrics.user_id.in_(opted_in_ids))
        .subquery()
    )

    # Latest weight per user
    latest_subq = (
        select(
            HealthMetrics.user_id,
            HealthMetrics.weight_kg.label("weight"),
            func.row_number()
            .over(
                partition_by=HealthMetrics.user_id,
                order_by=HealthMetrics.recorded_at.desc(),
            )
            .label("rn"),
        )
        .where(HealthMetrics.user_id.in_(opted_in_ids))
        .subquery()
    )

    rows = session.execute(
        select(
            User.email,
            (
                select(earliest_subq.c.weight)
                .where(earliest_subq.c.user_id == User.id, earliest_subq.c.rn == 1)
                .scalar_subquery()
                .label("start_weight")
            ),
            (
                select(latest_subq.c.weight)
                .where(latest_subq.c.user_id == User.id, latest_subq.c.rn == 1)
                .scalar_subquery()
                .label("end_weight")
            ),
            (
                select(func.count())
                .select_from(HealthMetrics)
                .where(HealthMetrics.user_id == User.id)
                .scalar_subquery()
                .label("weeks_tracked")
            ),
        ).where(User.id.in_(opted_in_ids))
    ).all()

    entries = []
    for email, start_w, end_w, weeks in rows:
        if start_w is None or end_w is None:
            continue
        lost = float(start_w) - float(end_w)
        if lost <= 0:
            continue
        entries.append(
            {
                "username": _mask_email(email),
                "weight_lost_kg": round(lost, 1),
                "weeks_tracked": int(weeks or 0),
            }
        )

    entries.sort(key=lambda x: x["weight_lost_kg"], reverse=True)
    ranked = [
        LeaderboardEntry(rank=i + 1, **e) for i, e in enumerate(entries[:_TOP_N])
    ]
    return LeaderboardOut(entries=ranked, total_opted_in=total_opted_in)
```

- [ ] **Step 10.2: Verify file imports cleanly**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -c "from app.api.v1.endpoints.leaderboard import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 10.3: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/api/v1/endpoints/leaderboard.py
git commit -m "feat(api): add leaderboard endpoint (opt-in, masked emails, top 10 by weight lost)"
```

---

## Task 11: Register new routers + update test support

**Files:**
- Modify: `backend/app/api/v1/router.py`
- Modify: `backend/tests/support.py`

- [ ] **Step 11.1: Add 3 new routers to `backend/app/api/v1/router.py`**

Add these three import lines after the last existing import (`from app.api.v1.endpoints.reminders import router as reminders_router`):

```python
from app.api.v1.endpoints.leaderboard import router as leaderboard_router
from app.api.v1.endpoints.referrals import router as referrals_router
from app.api.v1.endpoints.shared_plans import router as shared_plans_router
```

Add these three include lines after `router.include_router(reminders_router, tags=["reminders"])`:

```python
router.include_router(leaderboard_router, tags=["leaderboard"])
router.include_router(referrals_router, tags=["referrals"])
router.include_router(shared_plans_router, tags=["shared-plans"])
```

- [ ] **Step 11.2: Add new model imports to `backend/tests/support.py`**

After the last existing `import app.models.*` line (`import app.models.reminder  # noqa: F401`), add:

```python
import app.models.referral  # noqa: F401
import app.models.shared_plan  # noqa: F401
```

- [ ] **Step 11.3: Smoke-test the full app startup**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -c "from app.main import create_app; app = create_app(); routes = [r.path for r in app.routes]; assert any('/referrals' in r for r in routes), routes; print('OK')"
```

Expected: `OK`

- [ ] **Step 11.4: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/api/v1/router.py backend/tests/support.py
git commit -m "feat(router): register referrals, shared-plans, leaderboard routers"
```

---

## Task 12: Auth integration — ref_code on signup

**Files:**
- Modify: `backend/app/schemas/auth.py`
- Modify: `backend/app/api/v1/endpoints/auth.py`

- [ ] **Step 12.1: Add `ref_code` to `RegisterRequest`**

In `backend/app/schemas/auth.py`, inside the `RegisterRequest` class, add this field after the `password` field:

```python
    ref_code: str | None = None
```

- [ ] **Step 12.2: Handle ref_code in the register endpoint**

In `backend/app/api/v1/endpoints/auth.py`, add these imports at the top of the file (after existing imports):

```python
from app.services import referral_service, reward_service
```

Replace the existing `register` endpoint body so it becomes:

```python
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

    # Attribute the new user to a referral if a valid code was provided
    if payload.ref_code:
        referral = referral_service.get_referral_by_code(session, payload.ref_code)
        if referral:
            event = referral_service.assign_referral_to_user(session, referral, user.id)
            if event:
                reward_service.apply_signup_reward(
                    session, user.id, referral_event_id=event.id
                )

    return RegisterResponse(id=user.id, email=user.email)
```

- [ ] **Step 12.3: Verify the auth endpoint still works**

```bash
cd D:/WeightLoss/.claire/worktrees/trusting-ardinghelli/backend
python -c "from app.api.v1.endpoints.auth import router; print('OK')"
```

Expected: `OK`

- [ ] **Step 12.4: Run the existing auth tests to confirm nothing is broken**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/ -k "auth" -v 2>&1 | tail -20
```

Expected: all previously-passing auth tests still `PASSED`.

- [ ] **Step 12.5: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/schemas/auth.py backend/app/api/v1/endpoints/auth.py
git commit -m "feat(auth): attribute new users to referral code at signup, grant 7 free premium days"
```

---

## Task 13: Frontend hooks

**Files:**
- Create: `frontend/hooks/useReferral.ts`
- Create: `frontend/hooks/useSharePlan.ts`

- [ ] **Step 13.1: Write `useReferral.ts`**

```typescript
// frontend/hooks/useReferral.ts
"use client";

import { useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface ReferralStats {
  code: string | null;
  clicks: number;
  signups: number;
  conversions: number;
  rewards_earned: number;
  premium_until: string | null;
}

export interface UseReferralReturn {
  referralCode: string | null;
  referralLink: string;
  stats: ReferralStats | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T | null> {
  try {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    const res = await fetch(`${API}/api/v1${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export function useReferral(): UseReferralReturn {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const referralLink =
    referralCode && typeof window !== "undefined"
      ? `${window.location.origin}/referral/${referralCode}`
      : "";

  const refresh = async () => {
    setIsLoading(true);
    const [codeData, statsData] = await Promise.all([
      apiFetch<{ code: string; is_active: boolean }>("/referrals", { method: "POST" }),
      apiFetch<ReferralStats>("/referrals/stats"),
    ]);
    if (codeData) setReferralCode(codeData.code);
    if (statsData) setStats(statsData);
    setIsLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { referralCode, referralLink, stats, isLoading, refresh };
}
```

- [ ] **Step 13.2: Write `useSharePlan.ts`**

```typescript
// frontend/hooks/useSharePlan.ts
"use client";

import { useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface UseSharePlanReturn {
  shareUrl: string | null;
  isCreating: boolean;
  createShare: (planData: Record<string, unknown>) => Promise<string | null>;
}

export function useSharePlan(): UseSharePlanReturn {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const createShare = async (
    planData: Record<string, unknown>
  ): Promise<string | null> => {
    setIsCreating(true);
    try {
      const token =
        typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      const res = await fetch(`${API}/api/v1/shared-plans`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ plan_data: planData }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { slug: string };
      const url = `${window.location.origin}/shared-plan/${data.slug}`;
      setShareUrl(url);
      return url;
    } catch {
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  return { shareUrl, isCreating, createShare };
}
```

- [ ] **Step 13.3: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add frontend/hooks/useReferral.ts frontend/hooks/useSharePlan.ts
git commit -m "feat(frontend): add useReferral and useSharePlan hooks"
```

---

## Task 14: Share components

**Files:**
- Create: `frontend/components/sharing/ShareButton.tsx`
- Create: `frontend/components/sharing/ReferralWidget.tsx`

- [ ] **Step 14.1: Create `frontend/components/sharing/` directory and write `ShareButton.tsx`**

```tsx
// frontend/components/sharing/ShareButton.tsx
"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { useSharePlan } from "@/hooks/useSharePlan";

interface ShareButtonProps {
  planData: Record<string, unknown>;
  className?: string;
}

export function ShareButton({ planData, className = "" }: ShareButtonProps) {
  const { createShare, isCreating } = useSharePlan();
  const [label, setLabel] = useState<"share" | "copied" | "native">("share");

  const handleShare = async () => {
    const url = await createShare(planData);
    if (!url) return;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: "My Weight Loss Plan",
          text: "Check out my AI-generated weight loss plan!",
          url,
        });
        setLabel("native");
      } catch {
        // User cancelled share sheet — fall through to clipboard
        await navigator.clipboard.writeText(url);
        setLabel("copied");
      }
    } else {
      await navigator.clipboard.writeText(url);
      setLabel("copied");
    }

    setTimeout(() => setLabel("share"), 3000);
  };

  return (
    <button
      onClick={handleShare}
      disabled={isCreating}
      className={[
        "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium",
        "bg-emerald-600 text-white hover:bg-emerald-500",
        "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
        className,
      ].join(" ")}
    >
      {label === "copied" ? (
        <Check className="h-4 w-4" />
      ) : (
        <Share2 className="h-4 w-4" />
      )}
      {label === "copied"
        ? "Link copied!"
        : label === "native"
        ? "Shared!"
        : isCreating
        ? "Creating link…"
        : "Share your plan"}
    </button>
  );
}
```

- [ ] **Step 14.2: Write `ReferralWidget.tsx`**

```tsx
// frontend/components/sharing/ReferralWidget.tsx
"use client";

import { useState } from "react";
import { Check, Copy, Gift } from "lucide-react";
import { useReferral } from "@/hooks/useReferral";

export function ReferralWidget() {
  const { referralLink, stats, isLoading } = useReferral();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 animate-pulse h-36" />
    );
  }

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <Gift className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-white leading-tight">
            Invite friends, earn rewards
          </p>
          <p className="text-sm text-zinc-400 mt-0.5">
            Get 7 premium days for each friend who subscribes
          </p>
        </div>
      </div>

      {referralLink && (
        <div className="flex gap-2">
          <input
            readOnly
            value={referralLink}
            className="flex-1 min-w-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-300 outline-none"
          />
          <button
            onClick={handleCopy}
            className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-300 hover:bg-zinc-700 transition-colors"
            aria-label="Copy referral link"
          >
            {copied ? (
              <Check className="h-4 w-4 text-emerald-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-3 gap-3 pt-1">
          {(
            [
              { label: "Clicks", value: stats.clicks },
              { label: "Signups", value: stats.signups },
              {
                label: "Days earned",
                value: `+${stats.rewards_earned * 7}d`,
              },
            ] as const
          ).map(({ label, value }) => (
            <div
              key={label}
              className="rounded-lg bg-zinc-800/60 p-3 text-center"
            >
              <p className="text-lg font-bold text-white">{value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 14.3: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add frontend/components/sharing/
git commit -m "feat(frontend): add ShareButton and ReferralWidget components"
```

---

## Task 15: Referral route handler + register page ref capture

**Files:**
- Create: `frontend/app/referral/[code]/route.ts`
- Modify: `frontend/app/register/page.tsx`

- [ ] **Step 15.1: Write the referral route handler**

```typescript
// frontend/app/referral/[code]/route.ts
import { NextRequest, NextResponse } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
): Promise<NextResponse> {
  const { code } = await params;

  // Notify backend so the click is recorded in the DB
  try {
    const ip =
      request.headers.get("x-forwarded-for") ??
      request.headers.get("x-real-ip") ??
      "unknown";
    await fetch(`${BACKEND}/api/v1/referrals/track/${code}`, {
      headers: { "x-forwarded-for": ip },
    });
  } catch {
    // Non-blocking — never fail the redirect due to tracking error
  }

  // Redirect to register with the code as a query param.
  // The register page stores it in localStorage for inclusion in the signup body.
  const dest = new URL("/register", request.url);
  dest.searchParams.set("ref", code.toUpperCase());
  return NextResponse.redirect(dest);
}
```

- [ ] **Step 15.2: Add ref capture to the register page**

Open `frontend/app/register/page.tsx` and add a `useEffect` that reads the `?ref` query param on mount and stores it in localStorage. Add this import at the top of the file:

```typescript
import { useSearchParams } from "next/navigation";
```

Then add this hook inside the component (before the return statement):

```typescript
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) {
      localStorage.setItem("ref_code", ref.toUpperCase());
    }
  }, [searchParams]);
```

Then, wherever the component calls the registration API, include the stored ref code in the request body. Find the registration `fetch` call and update it to include:

```typescript
const refCode = localStorage.getItem("ref_code") ?? undefined;
// Include in the body:
body: JSON.stringify({ email, password, ...(refCode ? { ref_code: refCode } : {}) }),
```

After a successful registration, clear the stored code:

```typescript
localStorage.removeItem("ref_code");
```

- [ ] **Step 15.3: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add frontend/app/referral/ frontend/app/register/page.tsx
git commit -m "feat(frontend): referral route handler tracks clicks; register page captures ref_code"
```

---

## Task 16: Shared plan public page

**Files:**
- Create: `frontend/app/shared-plan/[slug]/page.tsx`

- [ ] **Step 16.1: Write the public shared plan page**

```tsx
// frontend/app/shared-plan/[slug]/page.tsx
import type { Metadata } from "next";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface PlanData {
  goal?: string;
  calories_per_day?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  timeline_weeks?: number;
  weekly_loss_target_kg?: number;
}

interface SharedPlan {
  slug: string;
  plan_data: PlanData;
  views: number;
  created_at: string;
  expires_at: string | null;
}

async function fetchPlan(slug: string): Promise<SharedPlan | null> {
  try {
    const res = await fetch(`${API}/api/v1/shared-plans/public/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return (await res.json()) as SharedPlan;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const plan = await fetchPlan(slug);
  if (!plan) return { title: "Plan not found" };

  const calories = plan.plan_data.calories_per_day ?? "—";
  const weeks = plan.plan_data.timeline_weeks ?? "—";

  return {
    title: `My Weight Loss Plan — ${calories} kcal/day for ${weeks} weeks`,
    description: `An AI-generated weight loss plan. Goal: ${plan.plan_data.goal ?? "lose weight"}`,
    openGraph: {
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/og/${slug}`,
          width: 1200,
          height: 630,
        },
      ],
    },
  };
}

export default async function SharedPlanPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const plan = await fetchPlan(slug);

  if (!plan) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-center space-y-3">
          <p className="text-2xl font-semibold text-white">Plan not found</p>
          <p className="text-zinc-400">This plan link has expired or been removed.</p>
          <a
            href="/"
            className="inline-block mt-4 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Create your own plan →
          </a>
        </div>
      </main>
    );
  }

  const { plan_data: p } = plan;

  const stats: Array<{ label: string; value: string }> = [
    { label: "Daily Calories", value: p.calories_per_day ? `${p.calories_per_day} kcal` : "—" },
    { label: "Protein", value: p.protein_g ? `${p.protein_g}g` : "—" },
    { label: "Carbs", value: p.carbs_g ? `${p.carbs_g}g` : "—" },
    { label: "Fat", value: p.fat_g ? `${p.fat_g}g` : "—" },
    { label: "Duration", value: p.timeline_weeks ? `${p.timeline_weeks} weeks` : "—" },
    {
      label: "Weekly Goal",
      value: p.weekly_loss_target_kg ? `-${p.weekly_loss_target_kg} kg/wk` : "—",
    },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 py-16 px-4">
      <div className="mx-auto max-w-lg space-y-8">
        <header className="text-center space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
            AI-Generated Weight Loss Plan
          </p>
          <h1 className="text-3xl font-bold text-white">
            {p.goal ? p.goal.replace(/_/g, " ") : "Weight Loss Plan"}
          </h1>
          <p className="text-sm text-zinc-500">{plan.views} views</p>
        </header>

        <div className="grid grid-cols-2 gap-4">
          {stats.map(({ label, value }) => (
            <div
              key={label}
              className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 text-center"
            >
              <p className="text-xl font-bold text-white">{value}</p>
              <p className="mt-1 text-xs text-zinc-500">{label}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <a
            href="/"
            className="inline-block rounded-lg bg-emerald-600 px-8 py-3 font-medium text-white hover:bg-emerald-500 transition-colors"
          >
            Get my own AI plan →
          </a>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 16.2: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add frontend/app/shared-plan/
git commit -m "feat(frontend): add public shared-plan page with OG metadata"
```

---

## Task 17: Leaderboard page

**Files:**
- Create: `frontend/app/leaderboard/page.tsx`

- [ ] **Step 17.1: Write the leaderboard page**

```tsx
// frontend/app/leaderboard/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Trophy } from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface LeaderboardEntry {
  rank: number;
  username: string;
  weight_lost_kg: number;
  weeks_tracked: number;
}

interface LeaderboardData {
  entries: LeaderboardEntry[];
  total_opted_in: number;
}

const RANK_STYLES: Record<number, string> = {
  1: "text-yellow-400",
  2: "text-zinc-400",
  3: "text-amber-600",
};

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`${API}/api/v1/leaderboard`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json() as Promise<LeaderboardData>;
      })
      .then(setData)
      .catch(() => setError("Could not load leaderboard."));
  }, []);

  return (
    <main className="min-h-screen bg-zinc-950 py-16 px-4">
      <div className="mx-auto max-w-lg space-y-8">
        <header className="text-center space-y-2">
          <div className="flex justify-center">
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <h1 className="text-3xl font-bold text-white">Leaderboard</h1>
          <p className="text-sm text-zinc-400">Top weight-loss transformations this month</p>
          {data && (
            <p className="text-xs text-zinc-600">
              {data.total_opted_in} members sharing their progress
            </p>
          )}
        </header>

        {error && <p className="text-center text-red-400 text-sm">{error}</p>}

        {data && data.entries.length === 0 && (
          <p className="text-center text-zinc-500 text-sm py-8">
            No entries yet — be the first to opt in from your settings!
          </p>
        )}

        {data && data.entries.length > 0 && (
          <ol className="space-y-3">
            {data.entries.map((entry) => (
              <li
                key={entry.rank}
                className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4"
              >
                <div className="flex items-center gap-4">
                  <span
                    className={[
                      "w-7 text-center text-lg font-bold",
                      RANK_STYLES[entry.rank] ?? "text-zinc-500",
                    ].join(" ")}
                  >
                    {entry.rank}
                  </span>
                  <div>
                    <p className="font-medium text-white">{entry.username}</p>
                    <p className="text-xs text-zinc-500">
                      {entry.weeks_tracked} weeks tracked
                    </p>
                  </div>
                </div>
                <span className="text-emerald-400 font-semibold">
                  −{entry.weight_lost_kg} kg
                </span>
              </li>
            ))}
          </ol>
        )}

        <div className="text-center text-xs text-zinc-600">
          Opt in to the leaderboard from{" "}
          <a href="/settings" className="underline hover:text-zinc-400">
            Settings
          </a>
          . All usernames are anonymised.
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 17.2: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add frontend/app/leaderboard/
git commit -m "feat(frontend): add opt-in leaderboard page with anonymised ranking"
```

---

## Task 18: OG image route handler

**Files:**
- Create: `frontend/app/api/og/[slug]/route.tsx`

- [ ] **Step 18.1: Write the OG image route**

```tsx
// frontend/app/api/og/[slug]/route.tsx
import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:8000";

export const runtime = "edge";

interface PlanData {
  goal?: string;
  calories_per_day?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  timeline_weeks?: number;
}

async function fetchPlanData(slug: string): Promise<PlanData | null> {
  try {
    const res = await fetch(`${BACKEND}/api/v1/shared-plans/public/${slug}`);
    if (!res.ok) return null;
    const body = (await res.json()) as { plan_data: PlanData };
    return body.plan_data;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
): Promise<ImageResponse | Response> {
  const { slug } = await params;
  const plan = await fetchPlanData(slug);

  if (!plan) {
    return new Response("Not found", { status: 404 });
  }

  const goal = plan.goal?.replace(/_/g, " ") ?? "Weight Loss Plan";
  const cal = plan.calories_per_day ?? "—";
  const weeks = plan.timeline_weeks ?? "—";
  const protein = plan.protein_g ?? "—";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#09090b",
          padding: 80,
          gap: 32,
        }}
      >
        {/* Label */}
        <span
          style={{
            fontSize: 16,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#34d399",
          }}
        >
          AI-Generated Plan
        </span>

        {/* Goal */}
        <h1
          style={{
            fontSize: 56,
            fontWeight: 800,
            color: "#ffffff",
            textAlign: "center",
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {goal}
        </h1>

        {/* Stats grid */}
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 16,
          }}
        >
          {[
            { label: "Daily Calories", value: `${cal} kcal` },
            { label: "Duration", value: `${weeks} weeks` },
            { label: "Protein", value: `${protein}g` },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                background: "#18181b",
                borderRadius: 16,
                padding: "24px 40px",
                border: "1px solid #27272a",
              }}
            >
              <span style={{ fontSize: 36, fontWeight: 800, color: "#ffffff" }}>
                {value}
              </span>
              <span style={{ fontSize: 14, color: "#71717a", marginTop: 4 }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Branding */}
        <span style={{ fontSize: 18, color: "#52525b", marginTop: 16 }}>
          weightloss.ai
        </span>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
```

- [ ] **Step 18.2: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add frontend/app/api/og/
git commit -m "feat(frontend): add dynamic OG image route for shared plans"
```

---

## Task 19: Inject ShareButton into plan page + ReferralWidget into dashboard

**Files:**
- Modify: `frontend/app/plan/page.tsx`
- Modify: `frontend/app/dashboard/page.tsx`

- [ ] **Step 19.1: Add ShareButton to `plan/page.tsx`**

In `frontend/app/plan/page.tsx`, add this import at the top:

```typescript
import { ShareButton } from "@/components/sharing/ShareButton";
```

Then, inside the returned JSX, after the `<PlanView plan={plan} />` component, add:

```tsx
      {plan && (
        <div className="mt-6 flex justify-center">
          <ShareButton planData={plan as unknown as Record<string, unknown>} />
        </div>
      )}
```

- [ ] **Step 19.2: Add ReferralWidget to `dashboard/page.tsx`**

In `frontend/app/dashboard/page.tsx`, add this import at the top:

```typescript
import { ReferralWidget } from "@/components/sharing/ReferralWidget";
```

Inside the returned JSX from `DashboardPage`, add the `<ReferralWidget />` component as a sibling after the main `<DashboardView>` component. Place it inside a container that matches the dashboard layout width:

```tsx
      <div className="mt-6">
        <ReferralWidget />
      </div>
```

- [ ] **Step 19.3: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add frontend/app/plan/page.tsx frontend/app/dashboard/page.tsx
git commit -m "feat(frontend): inject ShareButton on plan page and ReferralWidget on dashboard"
```

---

## Task 20: PostHog K-factor event tracking

**Files:**
- Modify: `backend/app/services/referral_service.py`
- Modify: `backend/app/services/reward_service.py`

PostHog is already installed in the frontend via `posthog-js`. Backend event tracking is done through the existing `AnalyticsEvent` model. Add K-factor events at the service layer so they flow into the existing analytics pipeline.

- [ ] **Step 20.1: Add event capture calls to `referral_service.py`**

In `backend/app/services/referral_service.py`, after the `session.commit()` in `assign_referral_to_user`, add:

```python
    # Record viral K-factor event in analytics
    from app.models.analytics import AnalyticsEvent
    from datetime import UTC, datetime

    analytics_event = AnalyticsEvent(
        event="referral_signup",
        user_id=referred_user_id,
        session_id="backend",
        ux_mode="growth",
        event_timestamp=datetime.now(UTC),
        properties={
            "referral_id": referral.id,
            "referral_event_id": event.id,
        },
    )
    session.add(analytics_event)
    session.commit()
```

- [ ] **Step 20.2: Add conversion event capture to `reward_service.py`**

In `backend/app/services/reward_service.py`, at the end of `apply_conversion_reward` (after `session.commit()`), add:

```python
    from app.models.analytics import AnalyticsEvent
    from datetime import UTC, datetime

    analytics_event = AnalyticsEvent(
        event="referral_paid_conversion",
        user_id=user.id,
        session_id="backend",
        ux_mode="growth",
        event_timestamp=datetime.now(UTC),
        properties={
            "referral_event_id": referral_event.id,
            "referrer_user_id": referral.referrer_user_id,
            "reward_days": _REFERRER_PREMIUM_DAYS,
        },
    )
    session.add(analytics_event)
    session.commit()
```

- [ ] **Step 20.3: Verify the service imports still resolve**

```bash
cd D:/WeightLoss/.claire/worktrees/trusting-ardinghelli/backend
python -c "from app.services.referral_service import assign_referral_to_user; from app.services.reward_service import apply_conversion_reward; print('OK')"
```

Expected: `OK`

- [ ] **Step 20.4: Run all service tests to confirm nothing broke**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/services/ -v
```

Expected: all tests `PASSED`.

- [ ] **Step 20.5: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add backend/app/services/referral_service.py backend/app/services/reward_service.py
git commit -m "feat(analytics): emit referral_signup and referral_paid_conversion K-factor events"
```

---

## Task 21: Documentation

**Files:**
- Create: `Documentation/Viral-Growth-System.md`

- [ ] **Step 21.1: Write the documentation file**

```markdown
# Viral Growth System

## Overview

The viral growth system drives organic user acquisition through referral loops, shareable plans, social sharing, and a leaderboard. It measures the viral coefficient (K-factor) so the team can optimise incentives over time.

## Viral Loop

```
User generates AI plan
  → Prompted to share (ShareButton on /plan)
  → Creates shareable link (/shared-plan/<slug>)
  → Shares to friends / social media (OG image auto-generated)
  → Friend visits shared plan → clicks "Get my own AI plan →"
  → Friend registers via /referral/<code> → ref code stored
  → Friend signs up → 7 free premium days rewarded
  → Friend subscribes → Referrer gets +7 premium days
  → Referrer re-shares (loop repeats)
```

**K-factor** = signups_via_referral / total_signups × conversion_to_paying_rate.
Track via `referral_signup` and `referral_paid_conversion` events in AnalyticsEvent.

---

## Referral System

### Referral Codes

- 8 characters, uppercase letters + digits (no 0/O, 1/I/L to avoid confusion)
- One active code per user (`referrals.is_active = true`)
- Stored in `referrals` table; delivered via `POST /api/v1/referrals`

### Attribution

1. User visits `/referral/ABCD1234`
2. Next.js route handler (`app/referral/[code]/route.ts`) tracks click in backend, then redirects to `/register?ref=ABCD1234`
3. Register page stores `ref_code` in `localStorage` on mount
4. On form submit, `ref_code` is included in the `RegisterRequest` body
5. Backend assigns the referral via `assign_referral_to_user()` after user creation

**Attribution window:** `localStorage` persists until the user signs up. No time expiry at the frontend; backend records the event at signup time.

**Self-referral:** Blocked — `assign_referral_to_user` returns `None` if `referral.referrer_user_id == referred_user_id`.

---

## Reward System

| Event | Who gets rewarded | Amount |
|-------|------------------|--------|
| New user signs up via referral | New user | 7 premium days |
| Referred user makes first payment | Referrer | 7 premium days |

**Premium days** extend `users.premium_until`. Stacking is additive (days are added on top of any existing premium period).

**Monthly cap:** Referrers can receive at most 20 conversion rewards per calendar month (`MAX_MONTHLY_REWARDS = 20` in `reward_service.py`).

**Idempotency:** Each `ReferralEvent` row has a unique `reward_logs.referral_event_id` column — only one reward can be issued per event. The service checks for an existing `RewardLog` before inserting.

---

## Shareable Plans

- Public URL: `/shared-plan/<slug>` (12-char lowercase alphanumeric slug)
- No authentication required to view
- **PII stripping:** Only `_ALLOWED_PLAN_KEYS` are stored (calories, macros, goal, timeline). Name, email, and exact age are excluded automatically by `sanitise()` in `shared_plan_service.py`
- Default expiry: 30 days from creation
- View counter incremented on each fetch
- OG image auto-generated at `/api/og/<slug>` (edge function, 1200×630)

---

## Leaderboard

- **Opt-in only** — `users.leaderboard_opt_in = true` required
- Ranks by `start_weight_kg − current_weight_kg` (weight actually lost)
- **Email masking:** `al***@***.com` format — no PII exposed
- Top 10 shown; all tracked in `health_metrics.weight_kg`
- Users can opt in/out from Settings

---

## Anti-Abuse

| Threat | Mitigation |
|--------|-----------|
| Click stuffing | Dedup by `sha256(IP)` within 1 hour window |
| Self-referral | Blocked at service layer |
| Duplicate rewards | `unique=True` on `reward_logs.referral_event_id` |
| Referral farming | Monthly cap: 20 conversion rewards per user per month |
| PII leakage via shared plans | `_ALLOWED_PLAN_KEYS` whitelist in `shared_plan_service.py` |

---

## Data Models

```
referrals
  id, referrer_user_id → users.id, code (unique), is_active, created_at

referral_events
  id, referral_id → referrals.id, event_type (click|signup|paid_conversion),
  referred_user_id → users.id (nullable), ip_hash, event_metadata (JSON), created_at

reward_logs
  id, user_id → users.id, referral_event_id → referral_events.id (unique),
  reward_type (premium_days), reward_value (int), status (applied|revoked), created_at

shared_plans
  id, user_id → users.id, slug (unique, 12 chars), plan_data (JSON, PII-stripped),
  views, is_active, created_at, expires_at
```

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/referrals` | Required | Get or create referral code |
| GET | `/api/v1/referrals/stats` | Required | Referral stats for current user |
| GET | `/api/v1/referrals/track/{code}` | None | Record referral click |
| POST | `/api/v1/referrals/conversion` | Required | Record paid conversion (trigger referrer reward) |
| POST | `/api/v1/shared-plans` | Required | Create shareable plan link |
| GET | `/api/v1/shared-plans/public/{slug}` | None | Get public plan data |
| GET | `/api/v1/shared-plans` | Required | List user's shared plans |
| DELETE | `/api/v1/shared-plans/{slug}` | Required | Deactivate a shared plan |
| GET | `/api/v1/leaderboard` | None | Top weight-loss leaderboard |

---

## Measuring Virality

Key metrics to track in PostHog / AnalyticsEvent:

- **`referral_signup`** — emitted when a referred user signs up
- **`referral_paid_conversion`** — emitted when a referred user pays
- **K-factor** = (referral signups / total signups) × (paid conversions / signups)
- **Top referrers** — query `reward_logs` grouped by `user_id`, sorted by count DESC
- **Best channels** — add `source` to `event_metadata` when tracking clicks (future enhancement)
```

- [ ] **Step 21.2: Commit**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli
git add Documentation/Viral-Growth-System.md
git commit -m "docs: add Viral-Growth-System documentation (architecture, rewards, anti-abuse, API reference)"
```

---

## Final Verification

- [ ] **Run all backend tests**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
python -m pytest tests/ -v 2>&1 | tail -30
```

Expected: all tests `PASSED`, none `FAILED`.

- [ ] **Start the backend and verify new routes appear in OpenAPI docs**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/backend
uvicorn app.main:app --reload --port 8000 &
curl -s http://localhost:8000/api/v1/openapi.json | python -m json.tool | grep '"path"' | grep -E "referral|shared|leaderboard"
```

Expected: paths for `/api/v1/referrals`, `/api/v1/shared-plans`, `/api/v1/leaderboard` are present.

- [ ] **Start the frontend and verify new pages load**

```bash
cd D:/WeightLoss/.claude/worktrees/trusting-ardinghelli/frontend
npm run dev &
# Then open: http://localhost:3000/leaderboard
# And open: http://localhost:3000/referral/TESTCODE  (should redirect to /register?ref=TESTCODE)
```

---

## Review Checklist

✅ Tasks 11.3.1 → 11.3.3 covered (referral system, sharing, tracking)
✅ True viral loop: User → Plan → Share → New User → Converts → Refers Others
✅ Referral codes unique, 8-char, collision-resistant
✅ Rewards idempotent — `unique=True` on `reward_logs.referral_event_id`
✅ Monthly cap — 20 conversion rewards per user per month
✅ Attribution via localStorage + `ref_code` in register body (works cross-origin)
✅ PII stripped from shared plans via `_ALLOWED_PLAN_KEYS` whitelist
✅ Leaderboard opt-in only, email masking
✅ OG image at edge (`runtime = "edge"`) for fast link previews
✅ Click dedup by IP hash within 1-hour window
✅ Self-referral blocked at service layer
✅ K-factor events in existing AnalyticsEvent table
✅ All share CTAs in ShareButton (1-click: native share or clipboard)
✅ Documentation in `Documentation/Viral-Growth-System.md`

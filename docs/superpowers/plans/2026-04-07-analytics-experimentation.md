# Analytics & Experimentation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate PostHog for full-funnel analytics, user identification, and A/B testing, plus a backend experiment-assignment service for server-validated pricing variants.

**Architecture:** PostHog JS SDK fires from the frontend for funnel analysis, page tracking, retention, and feature-flag-driven experiments. All existing `trackEvent`/`trackFunnelEvent` calls dual-fire to PostHog alongside the existing backend endpoint. A lightweight backend `ExperimentAssignment` table records deterministic variant assignments for authenticated users, exposing them via a REST endpoint so server-side code (e.g. pricing) can validate the assigned variant.

**Tech Stack:** `posthog-js` (frontend), Next.js App Router client components, FastAPI + SQLAlchemy + Alembic (backend experiment model), PostgreSQL.

---

## File Map

**New frontend files:**
- `frontend/lib/posthog.ts` — PostHog singleton init, typed `captureEvent`, `identifyUser`, `resetUser`, `getFeatureFlag`
- `frontend/app/components/providers/posthog-provider.tsx` — `'use client'` provider: init on mount, automatic `$pageview` tracking via `usePathname`
- `frontend/lib/experiments.ts` — typed `getExperimentVariant()`, `getPricingVariant()`, `getPaywallTiming()` helpers wrapping PostHog feature flags

**Modified frontend files:**
- `frontend/app/layout.tsx` — wrap `<body>` content with `<PostHogProvider>`
- `frontend/lib/analytics.ts` — add `plan_generated`, `paywall_viewed`, `subscription_started`, `onboarding_completed` to `AnalyticsEventName`; dual-fire both `trackEvent` and `trackFunnelEvent` to PostHog
- `frontend/lib/auth.ts` — call `identifyUser(userId)` in `setAccessToken`, `resetUser()` in `clearAccessToken`

**New backend files:**
- `backend/app/models/experiment.py` — `ExperimentAssignment` ORM model
- `backend/app/schemas/experiment.py` — `AssignmentResponse` Pydantic schema
- `backend/app/services/experiment_service.py` — `EXPERIMENTS` registry, `_bucket()`, `get_or_assign_variant()`
- `backend/app/api/v1/endpoints/experiments.py` — `GET /experiments/{key}/assignment`
- `backend/alembic/versions/c3d4e5f6a7b8_add_experiment_assignments.py` — migration
- `backend/tests/test_experiment_service.py`
- `backend/tests/test_experiments_api.py`

**Modified backend files:**
- `backend/app/models/__init__.py` — export `ExperimentAssignment`
- `backend/app/api/v1/router.py` — register `experiments_router`

**New docs:**
- `Documentation/Analytics-Experimentation-System.md`

---

### Task 1: Install PostHog JS + Create `frontend/lib/posthog.ts`

**Files:**
- Create: `frontend/lib/posthog.ts`

- [ ] **Step 1: Install posthog-js**

```bash
cd frontend && npm install posthog-js
```

Verify it appears in `package.json` dependencies.

- [ ] **Step 2: Create `frontend/lib/posthog.ts`**

```typescript
import posthog from 'posthog-js'

/**
 * Initialise PostHog once per page load. Safe to call multiple times.
 * No-ops when NEXT_PUBLIC_POSTHOG_KEY is missing (dev without a key).
 */
export function initPostHog(): void {
  if (typeof window === 'undefined') return
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return
  // posthog-js exposes __loaded after init; guard against double-init
  if ((posthog as unknown as { __loaded?: boolean }).__loaded) return

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: false,   // handled manually in PostHogProvider
    capture_pageleave: true,
    autocapture: false,        // explicit events only — no noisy DOM captures
    persistence: 'localStorage+cookie',
  })
}

/**
 * Fire a PostHog event. Silent no-op if PostHog is not initialised.
 */
export function captureEvent(
  event: string,
  properties: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return
  posthog.capture(event, properties)
}

/**
 * Identify an authenticated user. Call after login.
 */
export function identifyUser(
  userId: number,
  traits: Record<string, unknown> = {},
): void {
  if (typeof window === 'undefined') return
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return
  posthog.identify(String(userId), traits)
}

/**
 * Reset PostHog identity. Call on logout.
 */
export function resetUser(): void {
  if (typeof window === 'undefined') return
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return
  posthog.reset()
}

/**
 * Read a PostHog feature flag value (for A/B experiments).
 * Returns undefined when PostHog is not initialised or flag is unknown.
 */
export function getFeatureFlag(key: string): string | boolean | undefined {
  if (typeof window === 'undefined') return undefined
  if (!(posthog as unknown as { __loaded?: boolean }).__loaded) return undefined
  const value = posthog.getFeatureFlag(key)
  return value ?? undefined
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Update pnpm lockfile**

```bash
cd .. && pnpm install
```

Expected: lockfile updated cleanly.

- [ ] **Step 5: Commit**

```bash
git add frontend/lib/posthog.ts frontend/package.json pnpm-lock.yaml
git commit -m "feat: add PostHog JS client singleton (posthog.ts)"
```

---

### Task 2: PostHog React Provider + Page Tracking

**Files:**
- Create: `frontend/app/components/providers/posthog-provider.tsx`
- Modify: `frontend/app/layout.tsx`

- [ ] **Step 1: Create `frontend/app/components/providers/posthog-provider.tsx`**

```tsx
'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { type ReactNode, Suspense, useEffect } from 'react'
import { captureEvent, initPostHog } from '@/lib/posthog'

/**
 * Inner component — needs Suspense because useSearchParams suspends during SSR.
 */
function PageviewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    captureEvent('$pageview', {
      $current_url: window.location.href,
      pathname,
    })
  }, [pathname, searchParams])

  return null
}

/**
 * Wrap the app with this provider to enable PostHog tracking.
 * Place it near the root in layout.tsx (client-side only).
 */
export function PostHogProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    initPostHog()
  }, [])

  return (
    <>
      <Suspense fallback={null}>
        <PageviewTracker />
      </Suspense>
      {children}
    </>
  )
}
```

- [ ] **Step 2: Read `frontend/app/layout.tsx` (required before editing)**

Read the file at `frontend/app/layout.tsx` to confirm current content.

- [ ] **Step 3: Wrap layout body with `PostHogProvider`**

Replace `frontend/app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import { NavBarWrapper } from './components/nav-bar-wrapper'
import { PostHogProvider } from './components/providers/posthog-provider'

export const metadata: Metadata = {
  title: 'WeightLoss',
  description: 'WeightLoss — your personalised health companion',
}

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <PostHogProvider>
          <NavBarWrapper />
          {children}
        </PostHogProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/app/components/providers/posthog-provider.tsx frontend/app/layout.tsx
git commit -m "feat: add PostHogProvider with automatic pageview tracking"
```

---

### Task 3: Extend Event Schema + Dual-Fire to PostHog

**Files:**
- Modify: `frontend/lib/analytics.ts`

- [ ] **Step 1: Read `frontend/lib/analytics.ts` (required before editing)**

Read the current file to confirm its exact content.

- [ ] **Step 2: Replace `frontend/lib/analytics.ts` with extended schema and dual-fire**

```typescript
import { getAccessToken } from './auth'
import { captureEvent } from './posthog'

const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000'

export type AnalyticsEventName =
  // Onboarding
  | 'profile_questionnaire_started'
  | 'wizard_step_completed'
  | 'wizard_step_dropped'
  | 'wizard_completed'
  | 'mindmap_node_completed'
  | 'profile_questionnaire_completed'
  | 'ux_mode_preference_set'
  | 'ux_mode_resolved'
  | 'ux_mode_switched'
  // Core product
  | 'onboarding_completed'
  | 'plan_generated'
  | 'paywall_viewed'
  | 'subscription_started'
  // Funnel
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

export interface AnalyticsEventProperties {
  userId?: number
  uxMode: 'wizard' | 'mindmap'
  [key: string]: unknown
}

let _sessionId: string | null = null

function sessionId(): string {
  if (_sessionId) return _sessionId
  if (typeof window !== 'undefined') {
    const stored = sessionStorage.getItem('_analytics_sid')
    if (stored) {
      _sessionId = stored
      return _sessionId
    }
  }
  _sessionId = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('_analytics_sid', _sessionId)
  }
  return _sessionId
}

/**
 * Fire-and-forget analytics event to backend + PostHog.
 * Never throws — analytics failures must never break UX.
 */
export function trackEvent(
  event: AnalyticsEventName,
  properties: AnalyticsEventProperties,
): void {
  const sid = sessionId()
  const payload = {
    event,
    userId: properties.userId ?? null,
    sessionId: sid,
    uxMode: properties.uxMode,
    timestamp: new Date().toISOString(),
    properties,
  }

  // 1. Fire to PostHog (primary analytics platform)
  captureEvent(event, { ...properties, session_id: sid })

  // 2. Fire to backend (source-of-truth + fallback)
  const token = typeof window !== 'undefined' ? getAccessToken() : null
  fetch(`${apiBaseUrl}/api/v1/analytics/events`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  }).catch((err) => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[analytics] Event dropped:', event, err)
    }
  })
}

/**
 * Fire-and-forget funnel event to backend + PostHog.
 * No auth required (anonymous visitors).
 */
export function trackFunnelEvent(
  eventName: AnalyticsEventName,
  properties: Record<string, unknown> = {},
): void {
  const sid = sessionId()

  // 1. Fire to PostHog
  captureEvent(eventName, { ...properties, session_id: sid, funnel: true })

  // 2. Fire to backend funnel endpoint
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

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/analytics.ts
git commit -m "feat: extend event schema (plan_generated, paywall_viewed, etc.) + dual-fire to PostHog"
```

---

### Task 4: User Identification on Login / Logout

**Files:**
- Modify: `frontend/lib/auth.ts`

- [ ] **Step 1: Read `frontend/lib/auth.ts`**

Read the file to confirm current content before editing.

- [ ] **Step 2: Add `identifyUser` / `resetUser` calls to `setAccessToken` and `clearAccessToken`**

After the existing imports at the top of the file, add:

```typescript
import { identifyUser, resetUser } from './posthog'
```

Replace `setAccessToken`:

```typescript
export function setAccessToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token)
  // Clear any session data from a previous user
  window.sessionStorage.clear()

  // Identify in PostHog — decode userId from JWT payload (middle segment)
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { sub?: string }
    const userId = parseInt(payload.sub ?? '', 10)
    if (!isNaN(userId)) {
      identifyUser(userId)
    }
  } catch {
    // Non-fatal — PostHog identification is best-effort
  }
}
```

Replace `clearAccessToken`:

```typescript
export function clearAccessToken(): void {
  window.localStorage.removeItem(TOKEN_KEY)
  resetUser()
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/lib/auth.ts
git commit -m "feat: identify/reset PostHog user on login/logout"
```

---

### Task 5: Experiment Variant Helper (Frontend)

**Files:**
- Create: `frontend/lib/experiments.ts`

- [ ] **Step 1: Create `frontend/lib/experiments.ts`**

```typescript
import { getFeatureFlag } from './posthog'

/**
 * Keys must match the PostHog feature flag names configured in the dashboard.
 */
export type ExperimentKey =
  | 'paywall-timing'   // variants: 'after-plan' (default) | 'before-plan'
  | 'pricing-variant'  // variants: '9' (default) | '12' | '19'
  | 'headline-copy'    // variants: 'A' (default) | 'B'
  | 'cta-copy'         // variants: 'A' (default) | 'B'

export type ExperimentVariant = string | boolean | undefined

/**
 * Read a PostHog feature flag value for a named experiment.
 * Returns undefined when PostHog is not initialised or the key is unknown.
 */
export function getExperimentVariant(key: ExperimentKey): ExperimentVariant {
  return getFeatureFlag(key)
}

/**
 * Returns the active monthly price to display.
 * Defaults to $9 when PostHog is uninitialised or flag is absent.
 */
export function getPricingVariant(): 9 | 12 | 19 {
  const variant = getFeatureFlag('pricing-variant')
  if (variant === '12') return 12
  if (variant === '19') return 19
  return 9
}

/**
 * Returns whether to show the paywall before or after plan generation.
 * Defaults to 'after-plan'.
 */
export function getPaywallTiming(): 'before-plan' | 'after-plan' {
  const variant = getFeatureFlag('paywall-timing')
  return variant === 'before-plan' ? 'before-plan' : 'after-plan'
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/experiments.ts
git commit -m "feat: add typed experiment variant helpers (pricing, paywall timing, copy)"
```

---

### Task 6: Backend `ExperimentAssignment` Model + Migration

**Files:**
- Create: `backend/app/models/experiment.py`
- Modify: `backend/app/models/__init__.py`
- Create: `backend/alembic/versions/c3d4e5f6a7b8_add_experiment_assignments.py`
- Create: `backend/tests/test_experiment_model.py`

- [ ] **Step 1: Write the failing test**

```python
# backend/tests/test_experiment_model.py
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.experiment import ExperimentAssignment
from app.models.user import User
from app.core.security import get_password_hash


class ExperimentModelTest(unittest.TestCase):
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

    def test_assignment_roundtrip(self) -> None:
        user = User(
            email="x@y.com",
            full_name="X",
            hashed_password=get_password_hash("pw"),
        )
        self.session.add(user)
        self.session.flush()

        assignment = ExperimentAssignment(
            user_id=user.id,
            experiment_key="pricing-variant",
            variant="9",
        )
        self.session.add(assignment)
        self.session.commit()
        self.session.refresh(assignment)

        loaded = self.session.get(ExperimentAssignment, assignment.id)
        self.assertEqual(loaded.experiment_key, "pricing-variant")
        self.assertEqual(loaded.variant, "9")
        self.assertEqual(loaded.user_id, user.id)
        self.assertIsNotNone(loaded.assigned_at)

    def test_unique_per_user_per_experiment(self) -> None:
        from sqlalchemy.exc import IntegrityError

        user = User(
            email="a@b.com",
            full_name="A",
            hashed_password=get_password_hash("pw"),
        )
        self.session.add(user)
        self.session.flush()

        self.session.add(ExperimentAssignment(
            user_id=user.id, experiment_key="headline-copy", variant="A"
        ))
        self.session.commit()

        self.session.add(ExperimentAssignment(
            user_id=user.id, experiment_key="headline-copy", variant="B"
        ))
        with self.assertRaises(IntegrityError):
            self.session.commit()
```

- [ ] **Step 2: Run — expect ImportError**

```bash
cd backend && python -m pytest tests/test_experiment_model.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.models.experiment'`

- [ ] **Step 3: Create `backend/app/models/experiment.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ExperimentAssignment(Base):
    __tablename__ = "experiment_assignments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    experiment_key: Mapped[str] = mapped_column(String(100), nullable=False)
    variant: Mapped[str] = mapped_column(String(50), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    __table_args__ = (
        UniqueConstraint("user_id", "experiment_key", name="uq_experiment_assignment"),
    )
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && python -m pytest tests/test_experiment_model.py -v
```

Expected: 2 tests pass.

- [ ] **Step 5: Export from `backend/app/models/__init__.py`**

Read the current `__init__.py` first. Then add at the bottom of imports:

```python
from app.models.experiment import ExperimentAssignment
```

And add `"ExperimentAssignment"` to `__all__` if it exists, otherwise just append the import.

- [ ] **Step 6: Verify model import**

```bash
cd backend && python -c "from app.models import ExperimentAssignment; print('OK')"
```

Expected: `OK`

- [ ] **Step 7: Create `backend/alembic/versions/c3d4e5f6a7b8_add_experiment_assignments.py`**

First run `cd backend && alembic heads` to get the current revision ID. Use that as `down_revision`.

```python
# backend/alembic/versions/c3d4e5f6a7b8_add_experiment_assignments.py
"""add_experiment_assignments

Revision ID: c3d4e5f6a7b8
Revises: <CURRENT_HEAD>      # ← replace with output of `alembic heads`
Create Date: 2026-04-07 12:00:00.000000
"""
import sqlalchemy as sa
from alembic import op

revision = "c3d4e5f6a7b8"
down_revision = "<CURRENT_HEAD>"  # ← replace
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "experiment_assignments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("experiment_key", sa.String(length=100), nullable=False),
        sa.Column("variant", sa.String(length=50), nullable=False),
        sa.Column(
            "assigned_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "experiment_key", name="uq_experiment_assignment"),
    )
    op.create_index(
        op.f("ix_experiment_assignments_user_id"),
        "experiment_assignments",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_experiment_assignments_user_id"),
        table_name="experiment_assignments",
    )
    op.drop_table("experiment_assignments")
```

- [ ] **Step 8: Run migration**

```bash
cp D:/WeightLoss/backend/.env backend/.env
cd backend && alembic upgrade head
```

Expected: `Running upgrade <prev> -> c3d4e5f6a7b8, add_experiment_assignments`

- [ ] **Step 9: Commit**

```bash
git add backend/app/models/experiment.py backend/app/models/__init__.py \
        backend/alembic/versions/c3d4e5f6a7b8_add_experiment_assignments.py \
        backend/tests/test_experiment_model.py
git commit -m "feat: add ExperimentAssignment model + migration"
```

---

### Task 7: Backend Experiment Service (Deterministic Bucketing)

**Files:**
- Create: `backend/app/services/experiment_service.py`
- Create: `backend/tests/test_experiment_service.py`

- [ ] **Step 1: Write failing tests**

```python
# backend/tests/test_experiment_service.py
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models.user import User
from app.core.security import get_password_hash
from app.services.experiment_service import EXPERIMENTS, _bucket, get_or_assign_variant


class BucketingTest(unittest.TestCase):
    """Pure determinism tests — no DB needed."""

    def test_bucket_is_deterministic(self) -> None:
        v1 = _bucket(42, "pricing-variant", ["9", "12", "19"])
        v2 = _bucket(42, "pricing-variant", ["9", "12", "19"])
        self.assertEqual(v1, v2)

    def test_bucket_stays_within_variants(self) -> None:
        variants = ["9", "12", "19"]
        for user_id in range(200):
            result = _bucket(user_id, "pricing-variant", variants)
            self.assertIn(result, variants)

    def test_different_users_can_get_different_variants(self) -> None:
        variants = ["A", "B"]
        results = {_bucket(uid, "headline-copy", variants) for uid in range(100)}
        self.assertEqual(results, {"A", "B"})

    def test_known_experiment_keys_exist(self) -> None:
        for key in ["paywall-timing", "pricing-variant", "headline-copy", "cta-copy"]:
            self.assertIn(key, EXPERIMENTS)


class AssignmentPersistenceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(self.engine)
        self.factory = sessionmaker(bind=self.engine, autoflush=False, autocommit=False, class_=Session)

    def tearDown(self) -> None:
        Base.metadata.drop_all(self.engine)
        self.engine.dispose()

    def _make_user(self) -> User:
        with self.factory() as session:
            user = User(email="u@x.com", full_name="U", hashed_password=get_password_hash("pw"))
            session.add(user)
            session.commit()
            session.refresh(user)
            session.expunge(user)
            return user

    def test_first_call_creates_assignment(self) -> None:
        user = self._make_user()
        with self.factory() as session:
            variant = get_or_assign_variant(session, user.id, "pricing-variant")
        self.assertIn(variant, EXPERIMENTS["pricing-variant"])

    def test_second_call_returns_same_variant(self) -> None:
        user = self._make_user()
        with self.factory() as s1:
            v1 = get_or_assign_variant(s1, user.id, "pricing-variant")
        with self.factory() as s2:
            v2 = get_or_assign_variant(s2, user.id, "pricing-variant")
        self.assertEqual(v1, v2)

    def test_unknown_experiment_raises(self) -> None:
        user = self._make_user()
        with self.factory() as session:
            with self.assertRaises(ValueError):
                get_or_assign_variant(session, user.id, "unknown-experiment")
```

- [ ] **Step 2: Run — expect ImportError**

```bash
cd backend && python -m pytest tests/test_experiment_service.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.services.experiment_service'`

- [ ] **Step 3: Create `backend/app/services/experiment_service.py`**

```python
import hashlib
from typing import Final

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.experiment import ExperimentAssignment

# Registry of all experiments and their allowed variants.
# First variant is the control (default).
EXPERIMENTS: Final[dict[str, list[str]]] = {
    "paywall-timing": ["after-plan", "before-plan"],
    "pricing-variant": ["9", "12", "19"],
    "headline-copy": ["A", "B"],
    "cta-copy": ["A", "B"],
}


def _bucket(user_id: int, experiment_key: str, variants: list[str]) -> str:
    """Deterministic variant assignment via MD5 hash bucketing.

    The same (user_id, experiment_key) pair always produces the same variant,
    regardless of when or where it is called.
    """
    seed = f"{user_id}:{experiment_key}"
    hash_int = int(hashlib.md5(seed.encode(), usedforsecurity=False).hexdigest(), 16)
    return variants[hash_int % len(variants)]


def get_or_assign_variant(
    session: Session,
    user_id: int,
    experiment_key: str,
) -> str:
    """Return this user's variant for the experiment, creating a DB record on
    the first call and returning the stored value on subsequent calls.

    Raises ValueError for unknown experiment keys.
    """
    variants = EXPERIMENTS.get(experiment_key)
    if variants is None:
        raise ValueError(f"Unknown experiment key: {experiment_key!r}")

    existing = session.scalar(
        select(ExperimentAssignment).where(
            ExperimentAssignment.user_id == user_id,
            ExperimentAssignment.experiment_key == experiment_key,
        )
    )
    if existing is not None:
        return existing.variant

    variant = _bucket(user_id, experiment_key, variants)
    assignment = ExperimentAssignment(
        user_id=user_id,
        experiment_key=experiment_key,
        variant=variant,
    )
    session.add(assignment)
    session.commit()
    return variant
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd backend && python -m pytest tests/test_experiment_service.py -v
```

Expected: 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/services/experiment_service.py backend/tests/test_experiment_service.py
git commit -m "feat: add ExperimentService with deterministic hash bucketing"
```

---

### Task 8: Backend Experiment Endpoint

**Files:**
- Create: `backend/app/schemas/experiment.py`
- Create: `backend/app/api/v1/endpoints/experiments.py`
- Modify: `backend/app/api/v1/router.py`
- Create: `backend/tests/test_experiments_api.py`

- [ ] **Step 1: Write failing API test**

```python
# backend/tests/test_experiments_api.py
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.tests.support import ApiTestCase


class ExperimentsApiTest(ApiTestCase):
    def test_get_assignment_returns_valid_variant(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/experiments/pricing-variant/assignment", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data["experiment_key"], "pricing-variant")
        self.assertIn(data["variant"], ["9", "12", "19"])

    def test_same_user_always_gets_same_variant(self) -> None:
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        r1 = self.client.get("/api/v1/experiments/headline-copy/assignment", headers=headers)
        r2 = self.client.get("/api/v1/experiments/headline-copy/assignment", headers=headers)
        self.assertEqual(r1.json()["variant"], r2.json()["variant"])

    def test_different_users_may_get_different_variants(self) -> None:
        # Run enough users to make it extremely unlikely all land on the same variant
        variants = set()
        for i in range(20):
            user = self.create_user(email=f"user{i}@test.com")
            headers = self.auth_headers_for_user(user)
            r = self.client.get("/api/v1/experiments/pricing-variant/assignment", headers=headers)
            variants.add(r.json()["variant"])
        self.assertGreater(len(variants), 1)

    def test_unknown_experiment_returns_404(self) -> None:
        user = self.create_user(email="z@test.com")
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/experiments/nonexistent/assignment", headers=headers)
        self.assertEqual(resp.status_code, 404)

    def test_unauthenticated_returns_401(self) -> None:
        resp = self.client.get("/api/v1/experiments/pricing-variant/assignment")
        self.assertEqual(resp.status_code, 401)
```

- [ ] **Step 2: Run — expect failures (404 on all routes)**

```bash
cd backend && python -m pytest tests/test_experiments_api.py -v
```

Expected: all tests fail with 404 or import errors.

- [ ] **Step 3: Create `backend/app/schemas/experiment.py`**

```python
from pydantic import BaseModel


class AssignmentResponse(BaseModel):
    experiment_key: str
    variant: str
```

- [ ] **Step 4: Create `backend/app/api/v1/endpoints/experiments.py`**

```python
from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.experiment import AssignmentResponse
from app.services.experiment_service import EXPERIMENTS, get_or_assign_variant

router = APIRouter(prefix="/experiments")


@router.get("/{experiment_key}/assignment", response_model=AssignmentResponse)
def get_assignment(
    experiment_key: str = Path(..., description="Experiment key, e.g. 'pricing-variant'"),
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AssignmentResponse:
    """Return the authenticated user's deterministic variant for an experiment.

    Creates and persists a new assignment on the first call; returns the
    same stored variant on all subsequent calls.
    """
    if experiment_key not in EXPERIMENTS:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown experiment: {experiment_key!r}",
        )
    variant = get_or_assign_variant(session, current_user.id, experiment_key)
    return AssignmentResponse(experiment_key=experiment_key, variant=variant)
```

- [ ] **Step 5: Register the router in `backend/app/api/v1/router.py`**

Read the file first, then add:

```python
from app.api.v1.endpoints.experiments import router as experiments_router
```

And add after the last `router.include_router(...)` line:

```python
router.include_router(experiments_router, tags=["experiments"])
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
cd backend && python -m pytest tests/test_experiments_api.py -v
```

Expected: 5 tests pass.

- [ ] **Step 7: Run full backend suite (regression check)**

```bash
cd backend && python -m pytest tests/ -v
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add backend/app/schemas/experiment.py \
        backend/app/api/v1/endpoints/experiments.py \
        backend/app/api/v1/router.py \
        backend/tests/test_experiments_api.py
git commit -m "feat: add /experiments/{key}/assignment endpoint (deterministic server-side bucketing)"
```

---

### Task 9: Documentation

**Files:**
- Create: `Documentation/Analytics-Experimentation-System.md`

- [ ] **Step 1: Create `Documentation/Analytics-Experimentation-System.md`**

```markdown
# Analytics & Experimentation System

> Last updated: 2026-04-07

## Overview

WeightLoss uses a dual-track analytics architecture:

| Layer | Tool | Purpose |
|---|---|---|
| Product analytics | PostHog | Funnel dashboards, retention, session replay, feature flags |
| Backend event store | PostgreSQL `analytics_events` | Source of truth, offline analysis, fallback |
| Experiment assignments | PostgreSQL `experiment_assignments` | Server-validated, deterministic bucketing |

---

## Event Schema

All events share these base properties:

| Property | Type | Description |
|---|---|---|
| `session_id` | string | Browser session identifier (sessionStorage) |
| `user_id` | number \| null | Authenticated user ID; null for anonymous |
| `timestamp` | ISO 8601 | Client-side event time |
| `funnel` | boolean | Present on funnel events only |

### Event Catalogue

#### Onboarding Events
| Event | When fired | Key properties |
|---|---|---|
| `onboarding_started` | User begins the funnel onboarding form | — |
| `onboarding_step_completed` | Each step submitted | `step: 1\|2\|3` |
| `onboarding_completed` | Full profile submitted successfully | — |
| `onboarding_abandoned` | User leaves mid-onboarding | `last_step` |

#### Product Events
| Event | When fired | Key properties |
|---|---|---|
| `plan_generated` | Backend generates a meal/workout plan | `plan_type` |
| `paywall_viewed` | Subscription paywall shown | `pricing_variant`, `paywall_timing` |
| `subscription_started` | Stripe checkout completed successfully | `tier`, `pricing_variant` |
| `trial_expired` | 7-day trial ends | — |

#### Funnel Acquisition Events
| Event | When fired | Key properties |
|---|---|---|
| `landing_viewed` | `/funnel` page loads | — |
| `landing_variant_viewed` | A/B variant assigned on landing | `headline_variant`, `cta_variant` |
| `preview_viewed` | Calorie preview displayed | — |
| `upgrade_clicked` | "Unlock" CTA clicked | — |
| `checkout_started` | Stripe card form submitted | — |
| `conversion_completed` | User fully converted to paid | — |

#### UX Mode Events
| Event | When fired | Key properties |
|---|---|---|
| `ux_mode_resolved` | UX mode determined | `mode`, `source` |
| `ux_mode_preference_set` | User explicitly picks wizard/mindmap | `mode` |
| `ux_mode_switched` | Mode toggled mid-session | `from`, `to` |

---

## Funnel Definition

```
landing_viewed → onboarding_started → onboarding_completed → preview_viewed → upgrade_clicked → checkout_started → conversion_completed
```

### Tracking in PostHog

1. Open PostHog → **Product Analytics → Funnels**
2. Add steps in order using the event names above
3. Segment by `pricing_variant`, `headline_variant`, `device_type`

### Key Metrics
| Metric | Target |
|---|---|
| Landing → Onboarding start | > 40% |
| Onboarding start → Complete | > 60% |
| Preview → Upgrade click | > 25% |
| Checkout start → Conversion | > 70% |

---

## Retention Metrics

PostHog computes D1/D7/D30 retention automatically once users are identified.

### Setup in PostHog
1. **Product Analytics → Retention**
2. Starting event: `onboarding_completed`
3. Return event: `landing_viewed` OR `plan_generated`
4. Breakdown by cohort week

### Thresholds
| Metric | Healthy |
|---|---|
| D1 retention | > 40% |
| D7 retention | > 20% |
| D30 retention | > 10% |

---

## Experimentation Framework

### Architecture

- **Assignment**: Deterministic MD5 hash bucketing on `user_id + experiment_key`
- **Storage**: `experiment_assignments` table (one row per user per experiment, immutable)
- **Frontend read**: PostHog feature flags (client-side, real-time)
- **Backend validation**: `GET /api/v1/experiments/{key}/assignment` (for pricing — never trust client)

### Current Experiments

| Experiment Key | Variants | Default | Purpose |
|---|---|---|---|
| `paywall-timing` | `after-plan`, `before-plan` | `after-plan` | Show paywall before or after calorie preview |
| `pricing-variant` | `9`, `12`, `19` | `9` | Monthly price point ($USD) |
| `headline-copy` | `A`, `B` | `A` | Landing page headline variant |
| `cta-copy` | `A`, `B` | `A` | CTA button text variant |

### Adding a New Experiment

1. Add the key + variants to `EXPERIMENTS` in `backend/app/services/experiment_service.py`
2. Add the same key as a PostHog Feature Flag (PostHog dashboard → Feature Flags)
3. Add the `ExperimentKey` type union in `frontend/lib/experiments.ts`
4. Add a helper function if the experiment needs domain-specific logic (e.g. `getPricingVariant()`)
5. Fire `paywall_viewed` / relevant events with `pricing_variant` / `experiment_variant` in properties

### Pricing Experiments (Server-Validated)

**Never** read pricing from the client. Always validate server-side:

```typescript
// frontend — read assignment
const price = getPricingVariant()  // 9 | 12 | 19

// send to backend with checkout
await convertFunnelSession({ ..., pricingVariant: price })
```

```python
# backend — validate against stored assignment
assigned = get_or_assign_variant(session, user.id, "pricing-variant")
if str(payload.pricing_variant) != assigned:
    raise HTTPException(400, "Pricing variant mismatch")
```

---

## Weekly Optimisation Loop

1. **Monday**: Pull PostHog funnel report — identify weakest step (lowest conversion %)
2. **Tuesday**: Form hypothesis (e.g. "headline copy B will increase onboarding starts by 10%")
3. **Wednesday**: Configure PostHog feature flag rollout (e.g. 50% of new users)
4. **Friday+**: Monitor `landing_variant_viewed` breakdown in PostHog
5. **Next Monday**: Analyse results — ship winner, iterate on next weakest step

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_POSTHOG_KEY` | Yes (prod) | PostHog project API key |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog ingestion host (default: `https://us.i.posthog.com`) |

Add to `.env.local` for local development (PostHog events will be ignored without a key).

---

## Data Integrity Rules

1. **No duplicate events**: `trackEvent` / `trackFunnelEvent` are fire-and-forget; the caller is responsible for not calling them twice for the same user action.
2. **No sensitive data in properties**: Never include passwords, full card numbers, or raw PII in event properties.
3. **Timestamps**: Always use `new Date().toISOString()` — client clock, not server clock.
4. **Backend fallback**: All funnel and user events are persisted in `analytics_events` regardless of PostHog availability.
```

- [ ] **Step 2: Commit**

```bash
git add Documentation/Analytics-Experimentation-System.md
git commit -m "docs: add Analytics & Experimentation System documentation"
```

---

## Self-Review

### Spec Coverage Check

| Spec requirement | Covered by task |
|---|---|
| Integrate PostHog | Task 1, 2 |
| Define event schema (onboarding, plan, paywall) | Task 3 |
| Track `onboarding_started` | Already in `analytics.ts`; dual-fires to PostHog after Task 3 |
| Track `onboarding_completed` | Added to union in Task 3 |
| Track `plan_generated` | Added to union in Task 3 |
| Track `paywall_viewed` | Added to union in Task 3 |
| Track `subscription_started` | Added to union in Task 3 |
| Funnel: Visit → Plan → Paywall → Paid | Events in schema; PostHog funnel config in docs (Task 9) |
| Identify drop-off points | PostHog funnel dashboard (Task 9 docs) |
| D1/D7/D30 retention | PostHog retention (user identity in Task 4; docs in Task 9) |
| Sessions per user / feature usage | PostHog tracks automatically after Task 2 pageview |
| A/B testing infra | Tasks 5 (frontend), 7–8 (backend) |
| Test paywall timing | `paywall-timing` experiment key in Tasks 5, 7, 9 |
| Test pricing ($9/$12/$19) | `pricing-variant` experiment key in Tasks 5, 7, 8, 9 |
| Test copy variants | `headline-copy`, `cta-copy` in Tasks 5, 7, 9 |
| Server-controlled feature flags | Task 8 endpoint + PostHog dashboard |
| User-level assignment | Task 7 `get_or_assign_variant()` |
| Deterministic bucketing | Task 7 `_bucket()` (MD5 hash) |
| Log experiment exposure | `pricing_variant` / `paywall_timing` in event properties |
| Event schema docs | Task 9 |
| Funnel definitions | Task 9 |
| Retention metric definitions | Task 9 |
| Experimentation guide | Task 9 |
| Store docs in `/Documentation/` | Task 9 |
| < 50ms performance overhead | All tracking is fire-and-forget async (no await) |
| No sensitive data leakage | No PII in properties; doc rule in Task 9 |
| Centralized tracking logic | Single `trackEvent` / `trackFunnelEvent` / `captureEvent` |
| Typed event definitions | `AnalyticsEventName` union + `ExperimentKey` union |

### Gap: `plan_generated`, `paywall_viewed`, `subscription_started` call sites

The events are defined in the schema but the plan does not add explicit call sites in product code (plans endpoint, paywall component, Stripe webhook). These should be wired in separately as the features are built. The schema and infrastructure are ready.

### Placeholder Scan

No TBD, TODO, or "similar to task N" patterns. All code blocks are complete.

### Type Consistency

- `AnalyticsEventName` extended in Task 3 — all new events used by `trackFunnelEvent` (Task 3) are in the union.
- `ExperimentKey` (Task 5) matches `EXPERIMENTS` keys (Task 7) exactly: `paywall-timing`, `pricing-variant`, `headline-copy`, `cta-copy`.
- `AssignmentResponse` (Task 8) matches what the test asserts: `{ experiment_key, variant }`.
- `identifyUser(userId: number)` (Task 4) matches the signature in `posthog.ts` (Task 1).

# Mind Map & Wizard Server-Side State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move mind map and guided wizard state from localStorage (shared across all users on a browser) to per-user server-side storage so each user sees only their own data.

**Architecture:** Two new DB tables (`user_mindmap_states`, `user_wizard_states`) each storing a single JSONB blob per user. Two GET/PUT endpoint pairs on the backend. Frontend storage utilities become async and call the API instead of localStorage.

**Tech Stack:** Python/FastAPI/SQLAlchemy/Alembic (backend), TypeScript/Next.js (frontend), PostgreSQL JSONB

---

## File Map

### Created
- `backend/app/models/profile_state.py` — ORM models for both state tables
- `backend/app/schemas/profile_state.py` — Pydantic schemas
- `backend/app/api/v1/endpoints/profile_state.py` — GET/PUT endpoints for both states
- `backend/alembic/versions/<hash>_add_profile_state_tables.py` — migration
- `backend/tests/test_profile_state_api.py` — API tests

### Modified
- `backend/app/models/__init__.py` — register new models
- `backend/app/api/v1/router.py` — register new router
- `frontend/lib/api-client.ts` — add 4 API helper functions
- `frontend/app/mindmap/utils/storage.ts` — async, calls API
- `frontend/app/mindmap/hooks/useGraphState.ts` — handle async load
- `frontend/app/wizard/hooks/useWizardState.ts` — async, calls API

---

## Task 1: Backend model

**Files:**
- Create: `backend/app/models/profile_state.py`

- [ ] **Step 1: Write the model file**

```python
# backend/app/models/profile_state.py
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserMindMapState(Base):
    __tablename__ = "user_mindmap_states"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    state: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="mindmap_state")


class UserWizardState(Base):
    __tablename__ = "user_wizard_states"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    state: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    user: Mapped["User"] = relationship(back_populates="wizard_state")
```

- [ ] **Step 2: Register models in `__init__.py`**

In `backend/app/models/__init__.py`, add:
```python
from app.models.profile_state import UserMindMapState, UserWizardState
```
And add `"UserMindMapState"` and `"UserWizardState"` to `__all__`.

- [ ] **Step 3: Add back-references to User model**

In `backend/app/models/user.py`, add to the `User` class:
```python
from sqlalchemy.orm import relationship
# (add alongside existing relationships)
mindmap_state: Mapped["UserMindMapState | None"] = relationship(back_populates="user", uselist=False)
wizard_state: Mapped["UserWizardState | None"] = relationship(back_populates="user", uselist=False)
```

- [ ] **Step 4: Commit**
```bash
git add backend/app/models/profile_state.py backend/app/models/__init__.py backend/app/models/user.py
git commit -m "feat: add UserMindMapState and UserWizardState ORM models"
```

---

## Task 2: Alembic migration

**Files:**
- Create: `backend/alembic/versions/<hash>_add_profile_state_tables.py`

- [ ] **Step 1: Generate migration**
```bash
cd backend
cp D:/WeightLoss/backend/.env .env  # if in a worktree
alembic revision --autogenerate -m "add_profile_state_tables"
```
This creates a new file in `backend/alembic/versions/`. Open it and verify the `upgrade()` function contains `create_table` calls for `user_mindmap_states` and `user_wizard_states`. If autogenerate missed anything, edit to match:

```python
def upgrade() -> None:
    op.create_table(
        "user_mindmap_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("state", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_user_mindmap_states_user_id", "user_mindmap_states", ["user_id"])

    op.create_table(
        "user_wizard_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("state", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_user_wizard_states_user_id", "user_wizard_states", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_wizard_states_user_id", table_name="user_wizard_states")
    op.drop_table("user_wizard_states")
    op.drop_index("ix_user_mindmap_states_user_id", table_name="user_mindmap_states")
    op.drop_table("user_mindmap_states")
```

- [ ] **Step 2: Run migration**
```bash
cd backend && alembic upgrade head
```
Expected: `Running upgrade ... -> <hash>, add_profile_state_tables`

- [ ] **Step 3: Commit**
```bash
git add backend/alembic/versions/
git commit -m "feat: migration — add user_mindmap_states and user_wizard_states tables"
```

---

## Task 3: Backend schemas

**Files:**
- Create: `backend/app/schemas/profile_state.py`

- [ ] **Step 1: Write schema file**

```python
# backend/app/schemas/profile_state.py
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict


class ProfileStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    state: dict[str, Any]
    updated_at: datetime


class ProfileStateUpdate(BaseModel):
    state: dict[str, Any]
```

- [ ] **Step 2: Commit**
```bash
git add backend/app/schemas/profile_state.py
git commit -m "feat: add ProfileState pydantic schemas"
```

---

## Task 4: Backend endpoints

**Files:**
- Create: `backend/app/api/v1/endpoints/profile_state.py`

- [ ] **Step 1: Write endpoint file**

```python
# backend/app/api/v1/endpoints/profile_state.py
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.profile_state import UserMindMapState, UserWizardState
from app.models.user import User
from app.schemas.profile_state import ProfileStateResponse, ProfileStateUpdate

router = APIRouter()


# ── Mind Map ──────────────────────────────────────────────────────────────────

@router.get("/mindmap/state", response_model=ProfileStateResponse)
def get_mindmap_state(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserMindMapState).filter_by(user_id=current_user.id).first()
    if row is None:
        return ProfileStateResponse(state={}, updated_at=__import__('datetime').datetime.now(__import__('datetime').timezone.utc))
    return ProfileStateResponse.model_validate(row)


@router.put("/mindmap/state", response_model=ProfileStateResponse)
def put_mindmap_state(
    payload: ProfileStateUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserMindMapState).filter_by(user_id=current_user.id).first()
    if row is None:
        row = UserMindMapState(user_id=current_user.id, state=payload.state)
        session.add(row)
    else:
        row.state = payload.state
    session.commit()
    session.refresh(row)
    return ProfileStateResponse.model_validate(row)


# ── Wizard ────────────────────────────────────────────────────────────────────

@router.get("/wizard/state", response_model=ProfileStateResponse)
def get_wizard_state(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserWizardState).filter_by(user_id=current_user.id).first()
    if row is None:
        return ProfileStateResponse(state={}, updated_at=__import__('datetime').datetime.now(__import__('datetime').timezone.utc))
    return ProfileStateResponse.model_validate(row)


@router.put("/wizard/state", response_model=ProfileStateResponse)
def put_wizard_state(
    payload: ProfileStateUpdate,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> ProfileStateResponse:
    row = session.query(UserWizardState).filter_by(user_id=current_user.id).first()
    if row is None:
        row = UserWizardState(user_id=current_user.id, state=payload.state)
        session.add(row)
    else:
        row.state = payload.state
    session.commit()
    session.refresh(row)
    return ProfileStateResponse.model_validate(row)
```

- [ ] **Step 2: Register router in `backend/app/api/v1/router.py`**

Add to the imports and `include_router` calls:
```python
from app.api.v1.endpoints import profile_state
# ...
router.include_router(profile_state.router, tags=["profile-state"])
```

- [ ] **Step 3: Commit**
```bash
git add backend/app/api/v1/endpoints/profile_state.py backend/app/api/v1/router.py
git commit -m "feat: add mindmap and wizard state GET/PUT endpoints"
```

---

## Task 5: Backend tests

**Files:**
- Create: `backend/tests/test_profile_state_api.py`

- [ ] **Step 1: Write tests**

```python
# backend/tests/test_profile_state_api.py
from tests.support import ApiTestCase


class TestMindMapStateApi(ApiTestCase):
    def test_get_mindmap_state_returns_empty_when_no_state(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/mindmap/state", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"], {})

    def test_put_mindmap_state_creates_and_returns_state(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        payload = {"state": {"version": 2, "nodes": [], "edges": []}}
        resp = self.client.put("/api/v1/mindmap/state", json=payload, headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"]["version"], 2)

    def test_put_mindmap_state_upserts(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        self.client.put("/api/v1/mindmap/state", json={"state": {"version": 1}}, headers=headers)
        resp = self.client.put("/api/v1/mindmap/state", json={"state": {"version": 2}}, headers=headers)
        self.assertEqual(resp.json()["state"]["version"], 2)

    def test_mindmap_state_isolated_per_user(self):
        user_a = self.create_user(email="a@test.com")
        user_b = self.create_user(email="b@test.com")
        self.client.put(
            "/api/v1/mindmap/state",
            json={"state": {"owner": "a"}},
            headers=self.auth_headers_for_user(user_a),
        )
        resp = self.client.get("/api/v1/mindmap/state", headers=self.auth_headers_for_user(user_b))
        self.assertEqual(resp.json()["state"], {})

    def test_get_mindmap_state_requires_auth(self):
        resp = self.client.get("/api/v1/mindmap/state")
        self.assertEqual(resp.status_code, 401)


class TestWizardStateApi(ApiTestCase):
    def test_get_wizard_state_returns_empty_when_no_state(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/wizard/state", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"], {})

    def test_put_wizard_state_upserts(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        payload = {"state": {"currentStepIndex": 2, "steps": {}}}
        resp = self.client.put("/api/v1/wizard/state", json=payload, headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"]["currentStepIndex"], 2)

    def test_wizard_state_isolated_per_user(self):
        user_a = self.create_user(email="c@test.com")
        user_b = self.create_user(email="d@test.com")
        self.client.put(
            "/api/v1/wizard/state",
            json={"state": {"currentStepIndex": 3}},
            headers=self.auth_headers_for_user(user_a),
        )
        resp = self.client.get("/api/v1/wizard/state", headers=self.auth_headers_for_user(user_b))
        self.assertEqual(resp.json()["state"], {})
```

- [ ] **Step 2: Run tests**
```bash
cd backend && python -m pytest tests/test_profile_state_api.py -v
```
Expected: All 8 tests pass.

- [ ] **Step 3: Commit**
```bash
git add backend/tests/test_profile_state_api.py
git commit -m "test: add profile state API tests"
```

---

## Task 6: Frontend API client functions

**Files:**
- Modify: `frontend/lib/api-client.ts`

- [ ] **Step 1: Add these four functions at the end of `api-client.ts`**

```typescript
// ── Profile State ─────────────────────────────────────────────────────────────

export async function fetchMindMapState(): Promise<Record<string, unknown> | null> {
  const token = getAccessToken()
  if (!token) return null
  const res = await fetch(`${apiBaseUrl}/api/v1/mindmap/state`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json() as { state: Record<string, unknown> }
  return Object.keys(data.state).length === 0 ? null : data.state
}

export async function saveMindMapState(state: Record<string, unknown>): Promise<void> {
  const token = getAccessToken()
  if (!token) return
  await fetch(`${apiBaseUrl}/api/v1/mindmap/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ state }),
  })
}

export async function fetchWizardState(): Promise<Record<string, unknown> | null> {
  const token = getAccessToken()
  if (!token) return null
  const res = await fetch(`${apiBaseUrl}/api/v1/wizard/state`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return null
  const data = await res.json() as { state: Record<string, unknown> }
  return Object.keys(data.state).length === 0 ? null : data.state
}

export async function saveWizardState(state: Record<string, unknown>): Promise<void> {
  const token = getAccessToken()
  if (!token) return
  await fetch(`${apiBaseUrl}/api/v1/wizard/state`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ state }),
  })
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/lib/api-client.ts
git commit -m "feat: add fetchMindMapState, saveMindMapState, fetchWizardState, saveWizardState API helpers"
```

---

## Task 7: Mind map storage utility (async)

**Files:**
- Modify: `frontend/app/mindmap/utils/storage.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
// frontend/app/mindmap/utils/storage.ts
"use client"

import { fetchMindMapState, saveMindMapState } from '@/lib/api-client'
import type { MindMapEdge, MindMapNode } from "../types/graph"

const GRAPH_STORAGE_VERSION = 2

interface StoredGraphState {
  version: number
  nodes: MindMapNode[]
  edges: MindMapEdge[]
}

export async function loadGraphState(): Promise<{ nodes: MindMapNode[]; edges: MindMapEdge[] } | null> {
  const raw = await fetchMindMapState()
  if (!raw) return null

  try {
    const parsed = raw as Partial<StoredGraphState>
    if (
      parsed.version !== GRAPH_STORAGE_VERSION ||
      !Array.isArray(parsed.nodes) ||
      !Array.isArray(parsed.edges)
    ) {
      return null
    }
    return { nodes: parsed.nodes as MindMapNode[], edges: parsed.edges as MindMapEdge[] }
  } catch {
    return null
  }
}

export async function saveGraphState(input: { nodes: MindMapNode[]; edges: MindMapEdge[] }): Promise<void> {
  const payload: StoredGraphState = {
    version: GRAPH_STORAGE_VERSION,
    nodes: input.nodes,
    edges: input.edges,
  }
  await saveMindMapState(payload as unknown as Record<string, unknown>)
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/mindmap/utils/storage.ts
git commit -m "feat: mind map storage utility now persists to API instead of localStorage"
```

---

## Task 8: Mind map hook (async load)

**Files:**
- Modify: `frontend/app/mindmap/hooks/useGraphState.ts`

- [ ] **Step 1: Update the load `useEffect` to handle the async `loadGraphState`**

Replace only the load `useEffect` block (lines 71–93 in the original):

```typescript
  useEffect(() => {
    let isMounted = true

    loadGraphState().then((storedGraph) => {
      if (!isMounted) return

      if (storedGraph) {
        const normalizedStoredNodes = storedGraph.nodes.map(normalizeNode)
        const storedSchemaVersion = getRootSchemaVersion(normalizedStoredNodes)

        if (
          initialSchemaVersion === null ||
          storedSchemaVersion === initialSchemaVersion
        ) {
          setGraph({
            nodes: mergeStoredNodesWithInitialLayout(
              normalizedInitialNodes,
              normalizedStoredNodes,
            ),
            edges: initialGraph.edges,
          })
        }
      }

      setHasLoadedStorage(true)
    }).catch(() => {
      if (isMounted) setHasLoadedStorage(true)
    })

    return () => { isMounted = false }
  }, [initialSchemaVersion])
```

The save `useEffect` (lines 96–114) and all other code in the file remain unchanged — `saveGraphState` returns a Promise but is called fire-and-forget in the timeout, which is correct.

- [ ] **Step 2: Commit**
```bash
git add frontend/app/mindmap/hooks/useGraphState.ts
git commit -m "feat: useGraphState loads mind map state async from API"
```

---

## Task 9: Wizard hook (async load + save)

**Files:**
- Modify: `frontend/app/wizard/hooks/useWizardState.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
'use client'

import { useCallback, useEffect, useState } from 'react'
import { fetchWizardState, saveWizardState } from '@/lib/api-client'
import type { WizardState, WizardStepId, WizardStepState } from '../types/wizard'

const STEP_IDS: WizardStepId[] = [
  'personal-info',
  'goals',
  'medical-history',
  'lifestyle',
  'diet',
  'family-history',
]

function createInitialState(): WizardState {
  return {
    currentStepIndex: 0,
    steps: Object.fromEntries(
      STEP_IDS.map((id) => [id, { answers: {}, completed: false } satisfies WizardStepState])
    ) as Record<WizardStepId, WizardStepState>,
    startedAt: new Date().toISOString(),
  }
}

export function useWizardState() {
  const [state, setState] = useState<WizardState>(createInitialState)
  const [hydrated, setHydrated] = useState(false)

  // Load from server on mount
  useEffect(() => {
    let isMounted = true
    fetchWizardState().then((raw) => {
      if (!isMounted) return
      if (raw && Object.keys(raw).length > 0) {
        try {
          setState(raw as unknown as WizardState)
        } catch {
          // corrupt — start fresh
        }
      }
      setHydrated(true)
    }).catch(() => {
      if (isMounted) setHydrated(true)
    })
    return () => { isMounted = false }
  }, [])

  // Save to server on every state change (after hydration)
  useEffect(() => {
    if (hydrated) {
      saveWizardState(state as unknown as Record<string, unknown>)
    }
  }, [state, hydrated])

  const setStepAnswers = useCallback(
    (stepId: WizardStepId, answers: Record<string, unknown>) => {
      setState((prev) => ({
        ...prev,
        steps: {
          ...prev.steps,
          [stepId]: { ...prev.steps[stepId], answers, savedAt: new Date().toISOString() },
        },
        lastSavedAt: new Date().toISOString(),
      }))
    },
    []
  )

  const markStepCompleted = useCallback((stepId: WizardStepId) => {
    setState((prev) => ({
      ...prev,
      steps: {
        ...prev.steps,
        [stepId]: { ...prev.steps[stepId], completed: true, savedAt: new Date().toISOString() },
      },
    }))
  }, [])

  const goToStep = useCallback((index: number) => {
    setState((prev) => ({ ...prev, currentStepIndex: index }))
  }, [])

  const clearProgress = useCallback(() => {
    const fresh = createInitialState()
    setState(fresh)
    saveWizardState(fresh as unknown as Record<string, unknown>)
  }, [])

  return { state, hydrated, setStepAnswers, markStepCompleted, goToStep, clearProgress }
}
```

- [ ] **Step 2: Commit**
```bash
git add frontend/app/wizard/hooks/useWizardState.ts
git commit -m "feat: wizard state now persists to API instead of localStorage"
```

---

## Task 10: Smoke test

- [ ] **Step 1: Start backend and frontend**
```bash
# Terminal 1
cd backend && alembic upgrade head && uvicorn app.main:app --reload --port 8000

# Terminal 2
cd frontend && npm run dev
```

- [ ] **Step 2: Log in as a user, open Profile Questions (mind map), fill a few nodes, refresh the page**

Expected: Answers persist after refresh (loaded from server).

- [ ] **Step 3: Open the same browser as a different user**

Log out, log in as a different user. Open Profile Questions.
Expected: Empty mind map — no data from the other user.

- [ ] **Step 4: Open the Guided Wizard, fill some steps, refresh**

Expected: Progress persists after refresh (loaded from server).

- [ ] **Step 5: Commit any fixes, then run backend tests**
```bash
cd backend && python -m pytest tests/test_profile_state_api.py -v
```
Expected: All 8 pass.

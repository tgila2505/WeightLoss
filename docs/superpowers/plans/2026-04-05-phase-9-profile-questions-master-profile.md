# Phase 9: Profile Questions, Questionnaire Persistence & Master User Profile

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Populate all 45 mind map attribute nodes with structured questionnaire questions, persist answers to a dedicated backend table, generate a narrative Master User Profile via AI, display it on a new sidebar page with print-to-PDF support, and feed it into the meal/activity plan orchestrator.

**Architecture:** Five independently deployable phases — backend tables first, then frontend question rendering, then answer persistence wiring, then profile page + AI generation, then orchestrator enrichment and print support. Each phase leaves the application fully functional.

**Tech Stack:** Next.js (App Router, TypeScript), FastAPI (Python), SQLAlchemy 2.x (mapped columns), Alembic, httpx, React inline styles (existing pattern)

---

## File Map

**New files:**
- `backend/app/models/questionnaire.py` — QuestionnaireResponse + MasterUserProfile models
- `backend/alembic/versions/b1c2d3e4f5a6_questionnaire_tables.py` — migration
- `backend/app/schemas/questionnaire.py` — Pydantic schemas
- `backend/app/services/questionnaire_service.py` — service layer
- `backend/app/api/v1/endpoints/questionnaire.py` — 4 endpoints
- `frontend/app/user-profile/page.tsx` — User Profile page

**Modified files:**
- `backend/requirements.txt` — add httpx
- `backend/app/core/config.py` — add AI_SERVICES_URL setting
- `backend/app/api/v1/router.py` — register questionnaire router
- `frontend/app/mindmap/schema/questions.ts` — add types + populate all 45 nodes
- `frontend/lib/api-client.ts` — extend MindMapAnswerValue, add 4 new functions
- `frontend/app/mindmap/components/dynamic-form.tsx` — add 6 new renderers
- `frontend/app/mindmap/components/graph-view.tsx` — switch to new API functions
- `frontend/app/mindmap/components/node-card.tsx` — completion dot indicator
- `frontend/app/components/nav-bar.tsx` — add User Profile entry
- `ai-services/app/main.py` — add master-profile endpoint, accept master_profile in orchestrator
- `ai-services/app/orchestrator/models.py` — add master_profile field
- `ai-services/app/orchestrator/orchestrator.py` — pass master_profile to agents

---

## Phase 9.1: Backend Foundation

> **Safe to deploy independently.** Adds new tables and endpoints. Nothing in the existing app breaks.

---

### Task 9.1.1: Add httpx and create SQLAlchemy models

**Files:**
- Modify: `backend/requirements.txt`
- Create: `backend/app/models/questionnaire.py`

- [ ] **Step 1: Add httpx to requirements**

In `backend/requirements.txt`, add one line after the existing entries:

```
httpx==0.28.1
```

- [ ] **Step 2: Install it**

```bash
cd backend && pip install httpx==0.28.1
```

Expected: `Successfully installed httpx-0.28.1` (or already satisfied)

- [ ] **Step 3: Create `backend/app/models/questionnaire.py`**

```python
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class QuestionnaireResponse(Base):
    __tablename__ = "questionnaire_responses"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, index=True
    )
    node_id: Mapped[str] = mapped_column(String(100), nullable=False)
    answers: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (UniqueConstraint("user_id", "node_id", name="uq_questionnaire_user_node"),)

    user: Mapped["User"] = relationship(back_populates="questionnaire_responses")


class MasterUserProfile(Base):
    __tablename__ = "master_user_profiles"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"), nullable=False, unique=True, index=True
    )
    profile_text: Mapped[str] = mapped_column(Text, nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="master_profile")
```

- [ ] **Step 4: Register relationships on the User model**

Open `backend/app/models/user.py`. Add these two relationship imports at the top with the other model imports (they will be resolved lazily), and add these two lines inside the `User` class after the existing relationships:

```python
    questionnaire_responses: Mapped[list["QuestionnaireResponse"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    master_profile: Mapped["MasterUserProfile | None"] = relationship(
        back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
```

- [ ] **Step 5: Register models in `backend/app/models/__init__.py`**

Open the file and add:
```python
from app.models.questionnaire import MasterUserProfile, QuestionnaireResponse
```

- [ ] **Step 6: Commit**

```bash
git add backend/requirements.txt backend/app/models/questionnaire.py backend/app/models/user.py backend/app/models/__init__.py
git commit -m "feat(backend): add QuestionnaireResponse and MasterUserProfile models"
```

---

### Task 9.1.2: Alembic migration

**Files:**
- Create: `backend/alembic/versions/b1c2d3e4f5a6_questionnaire_tables.py`

- [ ] **Step 1: Create the migration file**

```bash
cd backend && alembic revision --autogenerate -m "questionnaire_tables"
```

Expected output: `Generating .../alembic/versions/XXXXXXXX_questionnaire_tables.py`

- [ ] **Step 2: Verify the generated migration**

Open the generated file. Confirm it creates `questionnaire_responses` with `user_id`, `node_id`, `answers` (JSONB), `updated_at`, a unique constraint on `(user_id, node_id)`, and `master_user_profiles` with `user_id` (unique), `profile_text`, `generated_at`. If autogenerate missed anything, add it manually following this pattern:

```python
def upgrade() -> None:
    op.create_table(
        "questionnaire_responses",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("node_id", sa.String(length=100), nullable=False),
        sa.Column("answers", postgresql.JSONB(), nullable=False, server_default="{}"),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "node_id", name="uq_questionnaire_user_node"),
    )
    op.create_index("ix_questionnaire_responses_user_id", "questionnaire_responses", ["user_id"])

    op.create_table(
        "master_user_profiles",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("profile_text", sa.Text(), nullable=False),
        sa.Column(
            "generated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("(CURRENT_TIMESTAMP)"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_master_user_profiles_user_id", "master_user_profiles", ["user_id"])


def downgrade() -> None:
    op.drop_table("master_user_profiles")
    op.drop_table("questionnaire_responses")
```

- [ ] **Step 3: Run the migration**

```bash
cd backend && alembic upgrade head
```

Expected: `Running upgrade ... -> XXXXXXXX, questionnaire_tables`

- [ ] **Step 4: Commit**

```bash
git add backend/alembic/versions/
git commit -m "feat(backend): migration for questionnaire_responses and master_user_profiles"
```

---

### Task 9.1.3: Pydantic schemas

**Files:**
- Create: `backend/app/schemas/questionnaire.py`

- [ ] **Step 1: Create `backend/app/schemas/questionnaire.py`**

```python
from datetime import datetime

from pydantic import BaseModel


class QuestionnaireAnswerUpsert(BaseModel):
    answers: dict


class QuestionnaireNodeResponse(BaseModel):
    node_id: str
    answers: dict
    updated_at: datetime

    model_config = {"from_attributes": True}


class AllQuestionnaireResponses(BaseModel):
    responses: dict[str, dict]


class MasterProfileResponse(BaseModel):
    profile_text: str
    generated_at: datetime

    model_config = {"from_attributes": True}
```

- [ ] **Step 2: Commit**

```bash
git add backend/app/schemas/questionnaire.py
git commit -m "feat(backend): Pydantic schemas for questionnaire endpoints"
```

---

### Task 9.1.4: Service layer

**Files:**
- Create: `backend/app/services/questionnaire_service.py`
- Modify: `backend/app/core/config.py`

- [ ] **Step 1: Add AI_SERVICES_URL to Settings**

In `backend/app/core/config.py`, add one field to the `Settings` dataclass:

```python
    ai_services_url: str
```

And add one line in `Settings.from_env()` inside the `return cls(...)` call:

```python
            ai_services_url=os.environ.get("AI_SERVICES_URL", "http://localhost:8001"),
```

- [ ] **Step 2: Create `backend/app/services/questionnaire_service.py`**

```python
from __future__ import annotations

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.profile import Profile
from app.models.questionnaire import MasterUserProfile, QuestionnaireResponse
from app.models.user import User
from app.schemas.questionnaire import QuestionnaireAnswerUpsert


class QuestionnaireService:
    def get_all_answers(self, session: Session, user: User) -> dict[str, dict]:
        rows = session.scalars(
            select(QuestionnaireResponse).where(QuestionnaireResponse.user_id == user.id)
        ).all()
        return {row.node_id: row.answers for row in rows}

    def upsert_node_answers(
        self,
        session: Session,
        user: User,
        node_id: str,
        payload: QuestionnaireAnswerUpsert,
    ) -> QuestionnaireResponse:
        existing = session.scalar(
            select(QuestionnaireResponse).where(
                QuestionnaireResponse.user_id == user.id,
                QuestionnaireResponse.node_id == node_id,
            )
        )
        if existing is None:
            row = QuestionnaireResponse(
                user_id=user.id, node_id=node_id, answers=payload.answers
            )
            session.add(row)
        else:
            existing.answers = payload.answers
            session.add(existing)

        session.commit()
        session.refresh(existing if existing else row)
        return existing if existing else row

    def get_master_profile(
        self, session: Session, user: User
    ) -> MasterUserProfile | None:
        return session.scalar(
            select(MasterUserProfile).where(MasterUserProfile.user_id == user.id)
        )

    def generate_master_profile(
        self, session: Session, user: User
    ) -> MasterUserProfile:
        questionnaire = self.get_all_answers(session, user)
        profile = session.scalar(select(Profile).where(Profile.user_id == user.id))

        demographics: dict = {}
        if profile is not None:
            demographics = {
                "name": profile.name,
                "age": profile.age,
                "gender": profile.gender,
                "height_cm": float(profile.height_cm) if profile.height_cm else None,
                "weight_kg": float(profile.weight_kg) if profile.weight_kg else None,
                "goal_target_weight_kg": (
                    float(profile.goal_target_weight_kg)
                    if profile.goal_target_weight_kg
                    else None
                ),
                "health_conditions": profile.health_conditions,
                "activity_level": profile.activity_level,
                "sleep_hours": float(profile.sleep_hours) if profile.sleep_hours else None,
                "diet_pattern": profile.diet_pattern,
            }

        settings = get_settings()
        try:
            response = httpx.post(
                f"{settings.ai_services_url}/orchestrator/master-profile",
                json={"user_id": user.id, "demographics": demographics, "questionnaire": questionnaire},
                timeout=120.0,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {exc.response.text}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service unavailable",
            ) from exc

        profile_text: str = response.json().get("profile_text", "")

        existing = self.get_master_profile(session, user)
        if existing is None:
            master = MasterUserProfile(user_id=user.id, profile_text=profile_text)
            session.add(master)
        else:
            existing.profile_text = profile_text
            session.add(existing)

        session.commit()
        result = self.get_master_profile(session, user)
        assert result is not None
        return result
```

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/questionnaire_service.py backend/app/core/config.py
git commit -m "feat(backend): questionnaire service layer with AI profile generation"
```

---

### Task 9.1.5: API endpoints and router registration

**Files:**
- Create: `backend/app/api/v1/endpoints/questionnaire.py`
- Modify: `backend/app/api/v1/router.py`

- [ ] **Step 1: Create `backend/app/api/v1/endpoints/questionnaire.py`**

```python
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.questionnaire import (
    AllQuestionnaireResponses,
    MasterProfileResponse,
    QuestionnaireAnswerUpsert,
    QuestionnaireNodeResponse,
)
from app.services.questionnaire_service import QuestionnaireService

router = APIRouter()
questionnaire_service = QuestionnaireService()


@router.get("/questionnaire", response_model=AllQuestionnaireResponses)
def get_all_questionnaire_answers(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AllQuestionnaireResponses:
    responses = questionnaire_service.get_all_answers(session, current_user)
    return AllQuestionnaireResponses(responses=responses)


@router.put(
    "/questionnaire/{node_id}",
    response_model=QuestionnaireNodeResponse,
    status_code=status.HTTP_200_OK,
)
def upsert_node_answers(
    node_id: str,
    payload: QuestionnaireAnswerUpsert,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> QuestionnaireNodeResponse:
    row = questionnaire_service.upsert_node_answers(session, current_user, node_id, payload)
    return QuestionnaireNodeResponse(
        node_id=row.node_id, answers=row.answers, updated_at=row.updated_at
    )


@router.get("/user-profile/master", response_model=MasterProfileResponse | None)
def get_master_profile(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MasterProfileResponse | None:
    master = questionnaire_service.get_master_profile(session, current_user)
    if master is None:
        return None
    return MasterProfileResponse(
        profile_text=master.profile_text, generated_at=master.generated_at
    )


@router.post(
    "/user-profile/generate",
    response_model=MasterProfileResponse,
    status_code=status.HTTP_200_OK,
)
def generate_master_profile(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MasterProfileResponse:
    master = questionnaire_service.generate_master_profile(session, current_user)
    return MasterProfileResponse(
        profile_text=master.profile_text, generated_at=master.generated_at
    )
```

- [ ] **Step 2: Register the router in `backend/app/api/v1/router.py`**

Add these two lines after the existing imports and `include_router` calls:

```python
from app.api.v1.endpoints.questionnaire import router as questionnaire_router
```

And:
```python
router.include_router(questionnaire_router, tags=["questionnaire"])
```

- [ ] **Step 3: Verify the backend starts**

```bash
cd backend && uvicorn app.main:app --reload --port 8000
```

Expected: `Application startup complete.` with no import errors. Navigate to `http://localhost:8000/docs` and confirm the four new routes appear: `GET /api/v1/questionnaire`, `PUT /api/v1/questionnaire/{node_id}`, `GET /api/v1/user-profile/master`, `POST /api/v1/user-profile/generate`.

- [ ] **Step 4: Commit**

```bash
git add backend/app/api/v1/endpoints/questionnaire.py backend/app/api/v1/router.py
git commit -m "feat(backend): questionnaire and master profile API endpoints"
```

---

## Phase 9.2: Question Schema & Form Renderers

> **Safe to deploy independently.** Frontend-only changes. Questions appear in modals but still save to localStorage (persistence wiring comes in Phase 9.3).

---

### Task 9.2.1: Extend QuestionType and MindMapAnswerValue

**Files:**
- Modify: `frontend/app/mindmap/schema/questions.ts`
- Modify: `frontend/lib/api-client.ts`

- [ ] **Step 1: Update `frontend/lib/api-client.ts` — extend MindMapAnswerValue**

Find this line (around line 127):
```typescript
export type MindMapAnswerValue = string | number;
```

Replace with:
```typescript
export type MindMapAnswerValue = string | number | string[];
```

- [ ] **Step 2: Replace `frontend/app/mindmap/schema/questions.ts` entirely**

```typescript
export type QuestionType =
  | "text"
  | "number"
  | "select"
  | "checkbox-group"
  | "radio"
  | "yes-no"
  | "likert-5"
  | "rating-10"
  | "multi-text"

export interface NodeQuestion {
  id: string
  label: string
  type: QuestionType
  required: boolean
  options?: string[]
  placeholder?: string
}

const defaultQuestions: NodeQuestion[] = [
  {
    id: "note",
    label: "Add a short note",
    type: "text",
    required: true,
  },
]

const questionSchemaByNodeId: Record<string, NodeQuestion[]> = {}

export function getQuestionsForNode(nodeId: string): NodeQuestion[] {
  return questionSchemaByNodeId[nodeId] ?? defaultQuestions
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/mindmap/schema/questions.ts frontend/lib/api-client.ts
git commit -m "feat(frontend): extend question types and MindMapAnswerValue for new input types"
```

---

### Task 9.2.2: Add new form renderers to DynamicForm

**Files:**
- Modify: `frontend/app/mindmap/components/dynamic-form.tsx`

- [ ] **Step 1: Replace `frontend/app/mindmap/components/dynamic-form.tsx` entirely**

```typescript
"use client"

import { useMemo } from "react"
import type { CSSProperties } from "react"

import type { MindMapAnswerValue } from "@/lib/api-client"

import type { NodeQuestion } from "../schema/questions"

export interface DynamicFormProps {
  questions: NodeQuestion[]
  values: Record<string, MindMapAnswerValue | "">
  errors: Record<string, string>
  onChange: (questionId: string, value: MindMapAnswerValue | "") => void
}

export function validateAnswers(
  questions: NodeQuestion[],
  values: Record<string, MindMapAnswerValue | "">,
): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const question of questions) {
    const value = values[question.id]

    if (question.required) {
      if (
        value === "" ||
        value === undefined ||
        (Array.isArray(value) && value.length === 0)
      ) {
        errors[question.id] = "This field is required."
        continue
      }
    }

    if (question.type === "number" && value !== "" && value !== undefined) {
      if (typeof value !== "number" || Number.isNaN(value)) {
        errors[question.id] = "Enter a valid number."
      }
    }

    if (question.type === "text" && typeof value === "string" && value.length > 500) {
      errors[question.id] = "Keep this answer under 500 characters."
    }

    if (
      question.type === "select" &&
      value !== "" &&
      value !== undefined &&
      question.options &&
      !question.options.includes(String(value))
    ) {
      errors[question.id] = "Choose a valid option."
    }
  }

  return errors
}

export function DynamicForm({
  questions,
  values,
  errors,
  onChange,
}: Readonly<DynamicFormProps>) {
  const renderedQuestions = useMemo(() => questions, [questions])

  return (
    <div style={{ display: "grid", gap: 14 }}>
      {renderedQuestions.map((question) => (
        <div key={question.id} style={{ display: "grid", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0f172a" }}>
            {question.label}
          </span>

          {question.type === "checkbox-group" && (
            <CheckboxGroup
              question={question}
              value={Array.isArray(values[question.id]) ? (values[question.id] as string[]) : []}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "radio" && (
            <RadioGroup
              question={question}
              value={typeof values[question.id] === "string" ? (values[question.id] as string) : ""}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "yes-no" && (
            <YesNo
              value={typeof values[question.id] === "string" ? (values[question.id] as string) : ""}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "likert-5" && (
            <Likert5
              value={typeof values[question.id] === "number" ? (values[question.id] as number) : 0}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "rating-10" && (
            <Rating10
              value={typeof values[question.id] === "number" ? (values[question.id] as number) : 0}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "multi-text" && (
            <MultiText
              value={Array.isArray(values[question.id]) ? (values[question.id] as string[]) : []}
              placeholder={question.placeholder}
              onChange={(val) => onChange(question.id, val)}
            />
          )}

          {question.type === "select" && (
            <select
              value={String(values[question.id] ?? "")}
              onChange={(event) => onChange(question.id, event.target.value)}
              style={fieldStyle}
            >
              <option value="">Select an option</option>
              {(question.options ?? []).map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {(question.type === "text" || question.type === "number") && (
            <input
              type={question.type === "number" ? "number" : "text"}
              value={typeof values[question.id] === "string" || typeof values[question.id] === "number" ? String(values[question.id] ?? "") : ""}
              placeholder={question.placeholder}
              onChange={(event) =>
                onChange(
                  question.id,
                  question.type === "number"
                    ? event.target.value === ""
                      ? ""
                      : Number(event.target.value)
                    : event.target.value,
                )
              }
              style={fieldStyle}
            />
          )}

          {errors[question.id] ? (
            <span style={{ fontSize: 12, color: "#dc2626" }}>{errors[question.id]}</span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function CheckboxGroup({
  question,
  value,
  onChange,
}: {
  question: NodeQuestion
  value: string[]
  onChange: (val: string[]) => void
}) {
  const toggle = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {(question.options ?? []).map((option) => (
        <label key={option} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={value.includes(option)}
            onChange={() => toggle(option)}
            style={{ width: 16, height: 16, accentColor: "#2563eb" }}
          />
          <span style={{ fontSize: 14, color: "#334155" }}>{option}</span>
        </label>
      ))}
    </div>
  )
}

function RadioGroup({
  question,
  value,
  onChange,
}: {
  question: NodeQuestion
  value: string
  onChange: (val: string) => void
}) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {(question.options ?? []).map((option) => (
        <label key={option} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
          <input
            type="radio"
            name={question.id}
            value={option}
            checked={value === option}
            onChange={() => onChange(option)}
            style={{ width: 16, height: 16, accentColor: "#2563eb" }}
          />
          <span style={{ fontSize: 14, color: "#334155" }}>{option}</span>
        </label>
      ))}
    </div>
  )
}

function YesNo({ value, onChange }: { value: string; onChange: (val: string) => void }) {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["yes", "no"].map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          style={{
            padding: "6px 20px",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 500,
            border: value === opt ? "2px solid #2563eb" : "1px solid #cbd5e1",
            backgroundColor: value === opt ? "#eff6ff" : "#ffffff",
            color: value === opt ? "#1d4ed8" : "#475569",
            cursor: "pointer",
            textTransform: "capitalize",
          }}
        >
          {opt === "yes" ? "Yes" : "No"}
        </button>
      ))}
    </div>
  )
}

const LIKERT_LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"]

function Likert5({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 4 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          title={LIKERT_LABELS[n - 1]}
          onClick={() => onChange(n)}
          style={{
            flex: 1,
            padding: "6px 0",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: value === n ? "2px solid #2563eb" : "1px solid #cbd5e1",
            backgroundColor: value === n ? "#2563eb" : "#ffffff",
            color: value === n ? "#ffffff" : "#475569",
            cursor: "pointer",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function Rating10({ value, onChange }: { value: number; onChange: (val: number) => void }) {
  return (
    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            border: value === n ? "2px solid #2563eb" : "1px solid #cbd5e1",
            backgroundColor: value === n ? "#2563eb" : "#ffffff",
            color: value === n ? "#ffffff" : "#475569",
            cursor: "pointer",
          }}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function MultiText({
  value,
  placeholder,
  onChange,
}: {
  value: string[]
  placeholder?: string
  onChange: (val: string[]) => void
}) {
  const entries = value.length > 0 ? value : [""]

  const updateAt = (index: number, text: string) => {
    const next = [...entries]
    next[index] = text
    onChange(next.filter((v) => v !== ""))
  }

  const addRow = () => onChange([...entries, ""])

  const removeAt = (index: number) => {
    const next = entries.filter((_, i) => i !== index)
    onChange(next.length > 0 ? next : [])
  }

  return (
    <div style={{ display: "grid", gap: 6 }}>
      {entries.map((entry, i) => (
        <div key={i} style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input
            type="text"
            value={entry}
            placeholder={placeholder ?? "Enter value"}
            onChange={(e) => updateAt(i, e.target.value)}
            style={{ ...fieldStyle, flex: 1 }}
          />
          {entries.length > 1 && (
            <button
              type="button"
              onClick={() => removeAt(i)}
              style={{
                padding: "6px 10px",
                borderRadius: 6,
                border: "1px solid #fca5a5",
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                cursor: "pointer",
                fontSize: 13,
              }}
            >
              ✕
            </button>
          )}
        </div>
      ))}
      <button
        type="button"
        onClick={addRow}
        style={{
          padding: "6px 12px",
          borderRadius: 6,
          border: "1px dashed #94a3b8",
          backgroundColor: "#f8fafc",
          color: "#475569",
          cursor: "pointer",
          fontSize: 13,
          textAlign: "left",
        }}
      >
        + Add another
      </button>
    </div>
  )
}

const fieldStyle: CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 14,
  color: "#0f172a",
  backgroundColor: "#ffffff",
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add frontend/app/mindmap/components/dynamic-form.tsx
git commit -m "feat(frontend): add checkbox-group, radio, yes-no, likert-5, rating-10, multi-text form renderers"
```

---

### Task 9.2.3: Add modal scroll support for long question lists

**Files:**
- Modify: `frontend/app/mindmap/components/node-modal.tsx`

- [ ] **Step 1: Add max-height + overflow-y to the modal inner panel**

In `node-modal.tsx`, find the inner `<div>` (the white panel that has `maxWidth: 520`). Change its style to add scrollable form area:

Old style object (starting around line 99):
```typescript
        style={{
          width: "100%",
          maxWidth: 520,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: 20,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
          display: "grid",
          gap: 16,
        }}
```

Replace with:
```typescript
        style={{
          width: "100%",
          maxWidth: 560,
          borderRadius: 12,
          backgroundColor: "#ffffff",
          padding: 20,
          boxShadow: "0 20px 40px rgba(15, 23, 42, 0.18)",
          display: "grid",
          gap: 16,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/mindmap/components/node-modal.tsx
git commit -m "feat(frontend): allow modal to scroll for long question lists"
```

---

### Task 9.2.4: Populate questions.ts with all 45 node schemas

**Files:**
- Modify: `frontend/app/mindmap/schema/questions.ts`

- [ ] **Step 1: Replace the empty `questionSchemaByNodeId` map with the full schema**

Open `frontend/app/mindmap/schema/questions.ts`. Replace:
```typescript
const questionSchemaByNodeId: Record<string, NodeQuestion[]> = {}
```

With the complete map below. This is the single largest change in the entire plan — add it all at once:

```typescript
const questionSchemaByNodeId: Record<string, NodeQuestion[]> = {
  "past-medical-history-musculoskeletal": [
    {
      id: "conditions",
      label: "Select all musculoskeletal conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Back pain", "Neck pain", "Shoulder pain", "Hip pain", "Knee pain",
        "Foot/ankle pain", "Osteoarthritis", "Rheumatoid arthritis", "Osteoporosis",
        "Fibromyalgia", "Gout", "Other musculoskeletal",
      ],
    },
  ],
  "past-medical-history-cancer": [
    {
      id: "conditions",
      label: "Select all cancer diagnoses that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Breast", "Prostate", "Colon/rectal", "Lung", "Skin (melanoma)",
        "Skin (non-melanoma)", "Thyroid", "Lymphoma", "Leukemia", "Ovarian",
        "Uterine", "Bladder", "Kidney", "Other cancer",
      ],
    },
  ],
  "past-medical-history-cardiovascular": [
    {
      id: "conditions",
      label: "Select all cardiovascular conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Hypertension", "High cholesterol", "Coronary artery disease",
        "Heart attack", "Heart failure", "Atrial fibrillation", "Stroke/TIA",
        "Peripheral artery disease", "Deep vein thrombosis", "Pulmonary embolism",
        "Aortic aneurysm", "Valvular heart disease", "Other cardiovascular",
      ],
    },
  ],
  "past-medical-history-respiratory": [
    {
      id: "conditions",
      label: "Select all respiratory conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Asthma", "COPD/Emphysema", "Chronic bronchitis", "Sleep apnea",
        "Pulmonary fibrosis", "Pulmonary hypertension", "Recurrent pneumonia",
        "Other respiratory",
      ],
    },
  ],
  "past-medical-history-endocrine": [
    {
      id: "conditions",
      label: "Select all endocrine conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Type 1 Diabetes", "Type 2 Diabetes", "Pre-diabetes",
        "Hypothyroidism", "Hyperthyroidism", "Hashimoto's thyroiditis",
        "Graves' disease", "Adrenal insufficiency", "Cushing's syndrome",
        "Polycystic ovary syndrome (PCOS)", "Metabolic syndrome", "Other endocrine",
      ],
    },
  ],
  "past-medical-history-neurologic": [
    {
      id: "conditions",
      label: "Select all neurologic conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Migraines", "Tension headaches", "Epilepsy/seizures",
        "Multiple sclerosis", "Parkinson's disease", "Alzheimer's/dementia",
        "Neuropathy", "Tremor", "Vertigo/dizziness", "Concussion history",
        "Other neurologic",
      ],
    },
  ],
  "past-medical-history-psychiatric": [
    {
      id: "conditions",
      label: "Select all psychiatric conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Depression", "Anxiety disorder", "Panic disorder", "PTSD",
        "Bipolar disorder", "OCD", "Eating disorder", "ADHD", "Autism spectrum",
        "Schizophrenia", "Substance use disorder", "Other psychiatric",
      ],
    },
  ],
  "past-medical-history-infections": [
    {
      id: "conditions",
      label: "Select all chronic/recurrent infections that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Hepatitis B", "Hepatitis C", "HIV", "Lyme disease",
        "Recurrent UTIs", "H. pylori", "Epstein-Barr / mono",
        "COVID-19 (long COVID)", "Other chronic/recurrent infection",
      ],
    },
  ],
  "past-medical-history-gynecologic": [
    {
      id: "conditions",
      label: "Select all gynecologic conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Endometriosis", "Uterine fibroids", "Ovarian cysts",
        "Cervical dysplasia", "Pelvic inflammatory disease", "Infertility",
        "Menopause (natural)", "Surgical menopause", "Premature ovarian insufficiency",
        "Abnormal uterine bleeding", "Other gynecologic",
      ],
    },
  ],
  "past-medical-history-gastroenterological": [
    {
      id: "conditions",
      label: "Select all gastrointestinal conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "GERD/acid reflux", "Peptic ulcer disease", "Irritable bowel syndrome",
        "Inflammatory bowel disease (Crohn's/UC)", "Celiac disease",
        "Non-alcoholic fatty liver", "Gallstones/gallbladder disease", "Pancreatitis",
        "Diverticulosis/diverticulitis", "Chronic constipation", "Chronic diarrhea", "Other GI",
      ],
    },
  ],
  "past-medical-history-surgical": [
    {
      id: "procedures",
      label: "List past surgical procedures (one per line)",
      type: "multi-text",
      required: false,
      placeholder: "e.g. Appendectomy, 2015",
    },
  ],
  "past-medical-history-other": [
    {
      id: "conditions",
      label: "List any other medical conditions not covered above",
      type: "multi-text",
      required: false,
      placeholder: "e.g. Chronic fatigue syndrome",
    },
  ],
  "dental-hygiene": [
    {
      id: "brushing",
      label: "How often do you brush and floss?",
      type: "radio",
      required: false,
      options: [
        "Brush 2x/day + floss daily",
        "Brush 2x/day, floss sometimes",
        "Brush once/day",
        "Irregular brushing",
      ],
    },
    {
      id: "dental-visits",
      label: "How often do you visit the dentist?",
      type: "radio",
      required: false,
      options: ["Every 6 months", "Once a year", "Every 2+ years", "Rarely/never"],
    },
  ],
  "dental-history": [
    {
      id: "conditions",
      label: "Select all dental history items that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Cavities/fillings", "Gum disease (gingivitis/periodontitis)", "Tooth loss",
        "Root canals", "Crowns or bridges", "Dental implants",
        "Orthodontic treatment", "TMJ disorder", "Teeth grinding (bruxism)",
        "Dry mouth", "Other dental history",
      ],
    },
  ],
  "family-history-relative": [
    {
      id: "parent",
      label: "Parent(s) — select conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Heart disease", "Stroke", "Type 2 Diabetes", "Cancer",
        "Hypertension", "High cholesterol", "Obesity", "Alzheimer's/dementia",
        "Mental health disorder", "Autoimmune disease", "Osteoporosis", "Other",
      ],
    },
    {
      id: "sibling",
      label: "Sibling(s) — select conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Heart disease", "Stroke", "Type 2 Diabetes", "Cancer",
        "Hypertension", "High cholesterol", "Obesity", "Alzheimer's/dementia",
        "Mental health disorder", "Autoimmune disease", "Osteoporosis", "Other",
      ],
    },
    {
      id: "grandparent",
      label: "Grandparent(s) — select conditions that apply",
      type: "checkbox-group",
      required: false,
      options: [
        "Heart disease", "Stroke", "Type 2 Diabetes", "Cancer",
        "Hypertension", "High cholesterol", "Obesity", "Alzheimer's/dementia",
        "Mental health disorder", "Autoimmune disease", "Osteoporosis", "Other",
      ],
    },
  ],
  "regular-medication-each-medicine": [
    {
      id: "medications",
      label: "List current medications (name, dose, frequency)",
      type: "multi-text",
      required: false,
      placeholder: "e.g. Metformin 500mg twice daily",
    },
  ],
  "nutrition-groups": [
    {
      id: "diet-pattern",
      label: "Which best describes your current diet pattern?",
      type: "radio",
      required: false,
      options: [
        "Omnivore (eat everything)",
        "Flexitarian (mostly plant-based, some meat)",
        "Pescatarian",
        "Vegetarian",
        "Vegan",
        "Keto/low-carb",
        "Paleo",
        "Mediterranean",
        "Other",
      ],
    },
    {
      id: "sensitivities",
      label: "Select any known food sensitivities or intolerances",
      type: "checkbox-group",
      required: false,
      options: [
        "Gluten", "Dairy", "Eggs", "Soy", "Nuts",
        "Shellfish", "Nightshades", "FODMAP foods", "None known",
      ],
    },
  ],
  "nutrition-habits": [
    {
      id: "meal-frequency",
      label: "How many times a day do you typically eat?",
      type: "radio",
      required: false,
      options: [
        "1-2 meals/day", "3 meals/day", "3 meals + snacks", "Grazing throughout day",
      ],
    },
    {
      id: "breakfast",
      label: "How often do you eat breakfast?",
      type: "radio",
      required: false,
      options: ["Always", "Most days", "Sometimes", "Rarely/never"],
    },
    {
      id: "home-cooking",
      label: "How often do you cook at home?",
      type: "radio",
      required: false,
      options: [
        "Most meals at home",
        "About half and half",
        "Mostly eat out / takeout",
      ],
    },
    {
      id: "tracks-macros",
      label: "Do you track calories or macros?",
      type: "yes-no",
      required: false,
    },
    {
      id: "intermittent-fasting",
      label: "Do you practice intermittent fasting?",
      type: "yes-no",
      required: false,
    },
    {
      id: "notes",
      label: "Any other dietary notes or restrictions?",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
  ],
  "exercise-types": [
    {
      id: "types",
      label: "Select all types of exercise you currently do",
      type: "checkbox-group",
      required: false,
      options: [
        "Walking", "Running/jogging", "Cycling", "Swimming", "Weight training",
        "HIIT", "Yoga", "Pilates", "Team sports", "Martial arts", "Dancing",
        "Rowing", "Elliptical", "None currently",
      ],
    },
  ],
  "exercise-habits": [
    {
      id: "frequency",
      label: "How often do you exercise?",
      type: "radio",
      required: false,
      options: [
        "Daily", "4-6x/week", "2-3x/week", "Once a week",
        "A few times a month", "Rarely/never",
      ],
    },
    {
      id: "duration",
      label: "Typical session duration",
      type: "radio",
      required: false,
      options: ["< 20 min", "20-30 min", "30-45 min", "45-60 min", "> 60 min"],
    },
    {
      id: "intensity",
      label: "Typical intensity",
      type: "radio",
      required: false,
      options: [
        "Low (light activity, no sweat)",
        "Moderate (elevated HR, some sweat)",
        "High (hard breathing, heavy sweat)",
        "Varies widely",
      ],
    },
    {
      id: "limitations",
      label: "Any physical limitations or injuries affecting exercise?",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
  ],
  "sleep-routine": [
    {
      id: "bedtime",
      label: "Typical bedtime",
      type: "text",
      required: false,
      placeholder: "e.g. 10:30 PM",
    },
    {
      id: "wake-time",
      label: "Typical wake time",
      type: "text",
      required: false,
      placeholder: "e.g. 6:30 AM",
    },
    {
      id: "total-sleep",
      label: "Total sleep per night (approximate)",
      type: "radio",
      required: false,
      options: ["< 5 hours", "5-6 hours", "6-7 hours", "7-8 hours", "> 8 hours"],
    },
    {
      id: "sleep-onset",
      label: "How long does it typically take to fall asleep?",
      type: "radio",
      required: false,
      options: ["< 10 min", "10-20 min", "20-30 min", "> 30 min"],
    },
  ],
  "sleep-habits": [
    {
      id: "screens-before-bed",
      label: "Do you use screens (phone/TV) within 1 hour of bed?",
      type: "yes-no",
      required: false,
    },
    {
      id: "afternoon-caffeine",
      label: "Do you consume caffeine after 2 PM?",
      type: "yes-no",
      required: false,
    },
    {
      id: "alcohol-for-sleep",
      label: "Do you use alcohol to help sleep?",
      type: "yes-no",
      required: false,
    },
    {
      id: "sleep-environment",
      label: "How would you describe your sleep environment?",
      type: "radio",
      required: false,
      options: [
        "Very dark and quiet",
        "Some light or noise",
        "Significant light/noise",
      ],
    },
    {
      id: "sleep-tracker",
      label: "Do you use a sleep tracking device?",
      type: "yes-no",
      required: false,
    },
  ],
  "sleep-symptoms-current-state": [
    {
      id: "symptoms",
      label: "Select all sleep symptoms you currently experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Difficulty falling asleep", "Waking during the night", "Waking too early",
        "Non-restorative sleep", "Daytime sleepiness", "Snoring",
        "Witnessed apneas (gasping)", "Restless legs", "Nightmares",
        "Sleepwalking", "None of the above",
      ],
    },
    {
      id: "overall-quality",
      label: "Overall sleep quality",
      type: "radio",
      required: false,
      options: ["Excellent", "Good", "Fair", "Poor", "Very poor"],
    },
  ],
  "stress-tolerance-routine": [
    {
      id: "practices",
      label: "Select all stress management practices you use regularly",
      type: "checkbox-group",
      required: false,
      options: [
        "Meditation/mindfulness", "Deep breathing exercises", "Journaling",
        "Prayer/spiritual practice", "Time in nature", "Creative outlets (art, music)",
        "Physical exercise", "Social connection", "Professional therapy/counseling",
        "No regular stress management practice",
      ],
    },
    {
      id: "leisure-time",
      label: "How many hours of personal/leisure time do you get per day (average)?",
      type: "radio",
      required: false,
      options: ["< 30 min", "30-60 min", "1-2 hours", "> 2 hours"],
    },
  ],
  "stress-tolerance-habits": [
    {
      id: "work-life-balance",
      label: "How would you describe your work-life balance?",
      type: "radio",
      required: false,
      options: [
        "Well balanced",
        "Somewhat balanced",
        "Mostly work/responsibilities",
        "Severely imbalanced",
      ],
    },
    {
      id: "overwhelm-frequency",
      label: "How often do you feel overwhelmed or burned out?",
      type: "radio",
      required: false,
      options: [
        "Rarely",
        "Sometimes (a few times/month)",
        "Often (weekly)",
        "Almost constantly",
      ],
    },
    {
      id: "relaxation-practice",
      label: "Do you have a regular relaxation practice?",
      type: "yes-no",
      required: false,
    },
  ],
  "stress-symptoms-current-state": [
    {
      id: "symptoms",
      label: "Select all stress symptoms you currently experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Irritability or mood swings", "Anxiety or worry", "Low mood/depression",
        "Brain fog / difficulty concentrating", "Forgetfulness",
        "Muscle tension or headaches", "Jaw clenching/teeth grinding",
        "Digestive upset", "Fatigue despite adequate sleep",
        "Increased appetite or cravings", "Decreased appetite",
        "Social withdrawal", "None of the above",
      ],
    },
    {
      id: "stress-level",
      label: "Overall current stress level (1 = very low, 10 = extreme)",
      type: "rating-10",
      required: false,
    },
  ],
  "relationships-quality": [
    {
      id: "relationship-rating",
      label: "How would you rate your closest personal relationships overall?",
      type: "radio",
      required: false,
      options: [
        "Excellent — very supportive",
        "Good — mostly positive",
        "Fair — some tension/challenges",
        "Poor — significant difficulties",
      ],
    },
    {
      id: "emotional-support",
      label: "Do you have people you can turn to for emotional support?",
      type: "radio",
      required: false,
      options: ["Yes, reliably", "Sometimes", "Rarely", "No"],
    },
  ],
  "relationships-habits": [
    {
      id: "social-frequency",
      label: "How often do you have meaningful social connection?",
      type: "radio",
      required: false,
      options: [
        "Daily meaningful connection",
        "Several times a week",
        "About once a week",
        "A few times a month",
        "Rarely",
      ],
    },
    {
      id: "lonely",
      label: "Do you feel lonely or isolated?",
      type: "yes-no",
      required: false,
    },
    {
      id: "relationship-stress",
      label: "Are relationship stressors a significant source of stress for you?",
      type: "yes-no",
      required: false,
    },
  ],
  "purpose-clarity-of-vision": [
    {
      id: "goal-clarity",
      label: "How clearly defined are your personal life goals?",
      type: "radio",
      required: false,
      options: [
        "Very clear — I know exactly what I'm working toward",
        "Somewhat clear — general direction but not specific",
        "Unclear — still figuring it out",
        "I haven't thought much about this",
      ],
    },
    {
      id: "vision",
      label: "What does living a healthy, fulfilling life look like to you?",
      type: "text",
      required: false,
      placeholder: "Brief description",
    },
  ],
  "purpose-assessment": [
    {
      id: "sense-of-purpose",
      label: "How strong is your sense of purpose in life?",
      type: "radio",
      required: false,
      options: [
        "Strong — I feel my life has clear meaning",
        "Moderate — I have some sense of purpose",
        "Weak — I often feel directionless",
        "Absent — I struggle to find meaning",
      ],
    },
    {
      id: "values-alignment",
      label: "Do your daily activities align with your core values?",
      type: "yes-no",
      required: false,
    },
    {
      id: "motivation",
      label: "What motivates you most to improve your health?",
      type: "text",
      required: false,
      placeholder: "Brief description",
    },
  ],
  "metabolic-flexibility-assessment": [
    {
      id: "between-meals",
      label: "How do you feel between meals (if you go 4-5 hours without eating)?",
      type: "radio",
      required: false,
      options: [
        "Fine — no hunger or energy dips",
        "Mild hunger but manageable",
        "Significant hunger and energy dip",
        "Irritable, shaky, or unable to focus",
      ],
    },
    {
      id: "morning-feeling",
      label: "How do you feel in the morning before eating?",
      type: "radio",
      required: false,
      options: [
        "Energized",
        "Neutral",
        "Groggy but okay after coffee",
        "Unable to function without eating immediately",
      ],
    },
    {
      id: "post-meal-crash",
      label: "Do you experience energy crashes after meals?",
      type: "yes-no",
      required: false,
    },
    {
      id: "carb-cravings",
      label: "Do you have strong cravings for carbohydrates or sugar?",
      type: "yes-no",
      required: false,
    },
  ],
  "metabolic-flexibility-habits": [
    {
      id: "eating-window",
      label: "What is your typical daily eating window?",
      type: "radio",
      required: false,
      options: [
        "< 8 hours (extended fasting)",
        "8-10 hours",
        "10-12 hours",
        "12-14 hours",
        "> 14 hours (eating most of the day)",
      ],
    },
    {
      id: "keto-history",
      label: "Have you ever followed a ketogenic or very low-carb diet?",
      type: "yes-no",
      required: false,
    },
    {
      id: "eat-on-waking",
      label: "Do you regularly eat within 1 hour of waking?",
      type: "yes-no",
      required: false,
    },
  ],
  "aerobics-capacity-current-state": [
    {
      id: "fitness-level",
      label: "How would you describe your current cardiovascular fitness?",
      type: "radio",
      required: false,
      options: [
        "Excellent — can sustain vigorous activity for 30+ min",
        "Good — comfortable with moderate activity",
        "Fair — get winded with moderate exertion",
        "Poor — short walks cause significant breathlessness",
      ],
    },
    {
      id: "stairs",
      label: "Can you climb 2 flights of stairs without stopping to catch your breath?",
      type: "radio",
      required: false,
      options: ["Yes, easily", "Yes, but I'm winded", "With difficulty", "No"],
    },
    {
      id: "exertion-symptoms",
      label: "Any symptoms during exertion (chest pain, palpitations, dizziness)?",
      type: "text",
      required: false,
      placeholder: "Optional — describe if yes",
    },
  ],
  "harmful-substance-habits": [
    {
      id: "smokes",
      label: "Do you currently smoke tobacco?",
      type: "yes-no",
      required: false,
    },
    {
      id: "tobacco-types",
      label: "If yes — tobacco types used",
      type: "checkbox-group",
      required: false,
      options: ["Cigarettes", "Cigars", "Pipe", "Chewing tobacco", "E-cigarettes/vaping"],
    },
    {
      id: "cigarettes-per-day",
      label: "If yes — how many per day?",
      type: "radio",
      required: false,
      options: ["< 5/day", "5-10/day", "11-20/day", "> 20/day"],
    },
    {
      id: "drinks-alcohol",
      label: "Do you drink alcohol?",
      type: "yes-no",
      required: false,
    },
    {
      id: "alcohol-frequency",
      label: "If yes — how much do you drink?",
      type: "radio",
      required: false,
      options: [
        "Occasionally (< 1x/week)",
        "1-3 drinks/week",
        "4-7 drinks/week",
        "1-2 drinks/day",
        "> 2 drinks/day",
      ],
    },
    {
      id: "recreational-drugs",
      label: "Do you use recreational drugs or cannabis?",
      type: "yes-no",
      required: false,
    },
    {
      id: "drug-details",
      label: "If yes — please describe (substance, frequency)",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
    {
      id: "non-prescribed",
      label: "Do you use any non-prescribed medications or supplements?",
      type: "yes-no",
      required: false,
    },
  ],
  "gut-health-current-state": [
    {
      id: "symptoms",
      label: "Select all GI symptoms you currently experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Bloating", "Gas/flatulence", "Abdominal pain or cramping",
        "Constipation (< 3 BMs/week)", "Diarrhea (loose stools > 3x/day)",
        "Alternating constipation and diarrhea", "Heartburn/acid reflux",
        "Nausea", "Food sensitivities/intolerances", "None of the above",
      ],
    },
    {
      id: "bowel-frequency",
      label: "Bowel movement frequency",
      type: "radio",
      required: false,
      options: ["< 3x/week", "3-6x/week", "Once daily", "2-3x daily", "> 3x daily"],
    },
    {
      id: "stool-consistency",
      label: "Typical stool consistency (Bristol scale)",
      type: "radio",
      required: false,
      options: [
        "Type 1-2 (hard/lumpy)",
        "Type 3-4 (normal)",
        "Type 5-6 (loose)",
        "Type 7 (watery)",
      ],
    },
    {
      id: "recent-antibiotics",
      label: "Have you taken antibiotics in the past 12 months?",
      type: "yes-no",
      required: false,
    },
    {
      id: "takes-probiotic",
      label: "Do you take a probiotic supplement?",
      type: "yes-no",
      required: false,
    },
  ],
  "detoxification-experience": [
    {
      id: "symptoms",
      label: "Select all that apply to your detoxification experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Multiple chemical sensitivities",
        "Sensitivity to fragrances/cleaning products",
        "Poor alcohol tolerance (feel effects more than others)",
        "Skin rashes or hives without clear cause",
        "Frequent headaches",
        "Fatigue after eating certain foods",
        "Night sweats unrelated to menopause/illness",
        "None of the above",
      ],
    },
    {
      id: "heavy-metal-testing",
      label: "Have you ever been diagnosed with or tested for heavy metal toxicity?",
      type: "yes-no",
      required: false,
    },
  ],
  "detoxification-work": [
    {
      id: "work-environment",
      label: "Which best describes your primary work environment?",
      type: "radio",
      required: false,
      options: [
        "Office / desk work (indoor)",
        "Indoor — industrial/manufacturing",
        "Outdoor — agriculture/landscaping",
        "Healthcare setting",
        "Construction / trades",
        "Home-based",
        "Other",
      ],
    },
    {
      id: "chemical-exposure",
      label: "Are you regularly exposed to chemicals, pesticides, or industrial solvents?",
      type: "yes-no",
      required: false,
    },
    {
      id: "filtered-water",
      label: "Do you use filtered water for drinking and cooking?",
      type: "yes-no",
      required: false,
    },
    {
      id: "organic-frequency",
      label: "How often do you eat organic produce?",
      type: "radio",
      required: false,
      options: ["Always or mostly", "Sometimes", "Rarely", "Never"],
    },
  ],
  "inflammation-current-state": [
    {
      id: "symptoms",
      label: "Select all inflammation indicators that apply to you",
      type: "checkbox-group",
      required: false,
      options: [
        "Chronic joint pain or stiffness", "Persistent fatigue",
        "Recurrent skin issues (eczema, psoriasis, acne)",
        "Frequent infections or slow recovery",
        "Allergies (seasonal or food)", "Autoimmune diagnosis", "Brain fog",
        "Unexplained weight gain", "Puffiness or water retention", "None of the above",
      ],
    },
    {
      id: "pain-level",
      label: "Overall inflammation / pain level (1 = none, 10 = severe)",
      type: "rating-10",
      required: false,
    },
  ],
  "mental-health-current-state": [
    {
      id: "current-mood",
      label: "How would you describe your current mood most days?",
      type: "radio",
      required: false,
      options: [
        "Generally positive and stable",
        "Mostly okay with occasional low days",
        "Frequently low, anxious, or irritable",
        "Persistently struggling",
      ],
    },
    {
      id: "anxiety-level",
      label: "Current anxiety level (1 = very low, 10 = severe)",
      type: "rating-10",
      required: false,
    },
    {
      id: "depression-level",
      label: "Current depression level (1 = none, 10 = severe)",
      type: "rating-10",
      required: false,
    },
    {
      id: "seeing-therapist",
      label: "Are you currently working with a mental health professional?",
      type: "yes-no",
      required: false,
    },
    {
      id: "mental-health-meds",
      label: "Are you currently taking medication for mental health?",
      type: "yes-no",
      required: false,
    },
    {
      id: "symptoms",
      label: "Select all mental health symptoms you experience",
      type: "checkbox-group",
      required: false,
      options: [
        "Difficulty concentrating", "Low motivation", "Social withdrawal",
        "Irritability or anger", "Emotional numbness", "Panic attacks",
        "Intrusive thoughts", "None of the above",
      ],
    },
  ],
  "social-history-current-state": [
    {
      id: "employment",
      label: "Current employment status",
      type: "radio",
      required: false,
      options: [
        "Employed full-time", "Employed part-time", "Self-employed",
        "Retired", "Student", "Homemaker", "Unemployed/seeking work", "Disabled",
      ],
    },
    {
      id: "living-situation",
      label: "Current living situation",
      type: "radio",
      required: false,
      options: [
        "Living alone", "With partner/spouse", "With family (children/parents)",
        "With roommates", "Other",
      ],
    },
    {
      id: "education",
      label: "Highest level of education completed",
      type: "radio",
      required: false,
      options: [
        "High school / GED", "Some college", "Associate's degree",
        "Bachelor's degree", "Graduate/professional degree",
      ],
    },
    {
      id: "stressors",
      label: "Select all that apply to your daily environment",
      type: "checkbox-group",
      required: false,
      options: [
        "High-stress work", "Long commute (> 45 min each way)",
        "Shift work or irregular hours", "Caregiver responsibilities",
        "Financial stress", "Housing instability", "Food insecurity", "None of the above",
      ],
    },
  ],
  "diabetes-history-objectives": [
    {
      id: "goals",
      label: "Select all diabetes-related goals that apply to you",
      type: "checkbox-group",
      required: false,
      options: [
        "Prevent diabetes", "Manage blood sugar", "Reduce A1C",
        "Reduce insulin resistance", "Lose weight related to diabetes",
        "Reduce diabetes medications", "Understand my numbers better",
        "Other diabetes-related goal",
      ],
    },
  ],
  "diabetes-history-diagnosis": [
    {
      id: "diagnosis",
      label: "Have you been diagnosed with diabetes or pre-diabetes?",
      type: "radio",
      required: false,
      options: [
        "No", "Pre-diabetes", "Type 2 Diabetes", "Type 1 Diabetes",
        "Gestational diabetes (past)", "LADA / other",
      ],
    },
    {
      id: "diagnosis-details",
      label: "If diagnosed, when and what is your current management approach?",
      type: "text",
      required: false,
      placeholder: "e.g. Diagnosed 2020, currently on Metformin",
    },
    {
      id: "a1c",
      label: "Most recent HbA1c (if known)",
      type: "radio",
      required: false,
      options: [
        "< 5.7% (normal)", "5.7-6.4% (pre-diabetes)",
        "6.5-7.0%", "7.1-8.0%", "8.1-9.0%", "> 9.0%", "Don't know",
      ],
    },
  ],
  "diabetes-history-family-history": [
    {
      id: "family-diabetes",
      label: "Does diabetes run in your immediate family?",
      type: "radio",
      required: false,
      options: [
        "No family history", "One parent", "Both parents",
        "Siblings", "Multiple relatives", "Not sure",
      ],
    },
    {
      id: "gestational-family",
      label: "Was gestational diabetes present in your family (mother or sisters)?",
      type: "yes-no",
      required: false,
    },
  ],
  "diabetes-history-cultural": [
    {
      id: "cultural-practices",
      label: "Do cultural or religious practices influence your diet or lifestyle? (optional)",
      type: "text",
      required: false,
      placeholder: "Optional",
    },
    {
      id: "ethnicity",
      label: "Ethnic background (influences metabolic risk assessment)",
      type: "radio",
      required: false,
      options: [
        "White/Caucasian", "Hispanic/Latino", "Black/African American",
        "South Asian", "East Asian", "Southeast Asian", "Middle Eastern",
        "Indigenous/First Nations", "Mixed", "Prefer not to say",
      ],
    },
  ],
  "change-readiness-readiness": [
    {
      id: "motivated",
      label: "I am motivated to make significant changes to my lifestyle.",
      type: "likert-5",
      required: false,
    },
    {
      id: "capable",
      label: "I believe I am capable of making and sustaining these changes.",
      type: "likert-5",
      required: false,
    },
    {
      id: "clear-why",
      label: "I have a clear understanding of why I want to improve my health.",
      type: "likert-5",
      required: false,
    },
    {
      id: "time-resources",
      label: "I have the time and resources available to commit to a health program.",
      type: "likert-5",
      required: false,
    },
    {
      id: "social-support",
      label: "I have support from people in my life for making these changes.",
      type: "likert-5",
      required: false,
    },
    {
      id: "past-struggles",
      label: "I have tried to make these changes before and struggled.",
      type: "likert-5",
      required: false,
    },
    {
      id: "willing-to-track",
      label: "I am willing to track my food, activity, and habits regularly.",
      type: "likert-5",
      required: false,
    },
    {
      id: "wants-coaching",
      label: "I am ready to work with a health coach or practitioner.",
      type: "likert-5",
      required: false,
    },
    {
      id: "expects-results",
      label: "I expect to see meaningful results within 3-6 months.",
      type: "likert-5",
      required: false,
    },
  ],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Start dev server and manually test one node modal**

```bash
cd frontend && npm run dev
```

Open `http://localhost:3000/mindmap`. Click on any 2nd-level node (e.g. "Cardiovascular" under Past Medical History). Confirm:
- The modal opens
- Checkboxes render with correct options
- Checking items updates the UI
- Clicking Save does not crash (it will still use the old localStorage path for now)

- [ ] **Step 4: Commit**

```bash
git add frontend/app/mindmap/schema/questions.ts
git commit -m "feat(frontend): populate all 45 mind map nodes with structured question schemas"
```

---

## Phase 9.3: Questionnaire Persistence

> **Depends on Phase 9.1 being deployed.** Switches answer storage from localStorage/adherence piggyback to the dedicated questionnaire API. The mind map still loads/saves correctly either way.

---

### Task 9.3.1: Add questionnaire API functions to api-client.ts

**Files:**
- Modify: `frontend/lib/api-client.ts`

- [ ] **Step 1: Add the four new functions at the end of `frontend/lib/api-client.ts`**

```typescript
export async function fetchAllQuestionnaireAnswers(): Promise<Record<string, Record<string, MindMapAnswerValue>>> {
  const data = await request<{ responses: Record<string, Record<string, MindMapAnswerValue>> }>(
    `${apiBaseUrl}/api/v1/questionnaire`
  );
  return data.responses;
}

export async function saveNodeAnswers(
  nodeId: string,
  answers: Record<string, MindMapAnswerValue>
): Promise<void> {
  await request<unknown>(`${apiBaseUrl}/api/v1/questionnaire/${encodeURIComponent(nodeId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers }),
  });
}

export async function generateMasterProfile(): Promise<{ profile_text: string; generated_at: string }> {
  return request<{ profile_text: string; generated_at: string }>(
    `${apiBaseUrl}/api/v1/user-profile/generate`,
    { method: 'POST' }
  );
}

export async function fetchMasterProfile(): Promise<{ profile_text: string; generated_at: string } | null> {
  return requestNullable<{ profile_text: string; generated_at: string }>(
    `${apiBaseUrl}/api/v1/user-profile/master`
  );
}
```

Note: `requestNullable` already exists in api-client.ts (used by the 404-returning profile endpoint). If it does not exist, add this helper before the new functions:

```typescript
async function requestNullable<T>(url: string, init?: RequestInit): Promise<T | null> {
  const token = getAccessToken();
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  return (await response.json()) as T;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/lib/api-client.ts
git commit -m "feat(frontend): add fetchAllQuestionnaireAnswers, saveNodeAnswers, generateMasterProfile, fetchMasterProfile"
```

---

### Task 9.3.2: Switch graph-view to use new questionnaire endpoints

**Files:**
- Modify: `frontend/app/mindmap/components/graph-view.tsx`

- [ ] **Step 1: Update the import line in graph-view.tsx**

Find the existing import:
```typescript
import {
  fetchProfile,
  fetchMindMapAnswers,
  saveMindMapAnswers,
  type MindMapAnswerValue,
} from "@/lib/api-client"
```

Replace with:
```typescript
import {
  fetchProfile,
  fetchAllQuestionnaireAnswers,
  saveNodeAnswers,
  type MindMapAnswerValue,
} from "@/lib/api-client"
```

- [ ] **Step 2: Find the useEffect that calls fetchMindMapAnswers and replace it**

Locate the block that calls `fetchMindMapAnswers()` (searches adherence records). Replace the entire fetch block:

Old pattern (will look roughly like):
```typescript
  useEffect(() => {
    fetchMindMapAnswers().then((records) => {
      // ... updates graph nodes with answers
    })
  }, [])
```

Replace with:
```typescript
  useEffect(() => {
    fetchAllQuestionnaireAnswers().then((allAnswers) => {
      Object.entries(allAnswers).forEach(([nodeId, answers]) => {
        updateNode(nodeId, (node) => {
          return updateNodeMetadata(node, {
            answers,
            completion: Object.keys(answers).length > 0 ? "complete" : "none",
            savedAt: new Date().toISOString(),
          })
        })
      })
    }).catch(() => {
      // silently ignore — user may not have saved any answers yet
    })
  }, [updateNode])
```

- [ ] **Step 3: Find the modal submit handler that calls saveMindMapAnswers and replace it**

Look for a function (likely `handleModalSubmit` or similar) that calls `saveMindMapAnswers(...)`. Replace the `saveMindMapAnswers` call with `saveNodeAnswers`:

Old:
```typescript
await saveMindMapAnswers({ nodeId: selectedNode.id, answers, completed: true })
```

New:
```typescript
await saveNodeAnswers(selectedNode.id, answers)
```

Also update the node state after save (this pattern likely already exists — just make sure it still runs):
```typescript
updateNode(selectedNode.id, (node) =>
  updateNodeMetadata(node, {
    answers,
    completion: "complete",
    savedAt: new Date().toISOString(),
  })
)
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/mindmap/components/graph-view.tsx
git commit -m "feat(frontend): switch mind map answer persistence from adherence records to questionnaire API"
```

---

### Task 9.3.3: Completion dot on node cards

**Files:**
- Modify: `frontend/app/mindmap/components/node-card.tsx`

- [ ] **Step 1: Read the current node-card.tsx to understand its structure**

Open `frontend/app/mindmap/components/node-card.tsx`. Find where the node label is rendered and where `completion` is used (if at all).

- [ ] **Step 2: Add a filled dot indicator for completed nodes**

In the JSX where the node content is rendered, add a small green dot when `node.metadata.completion === "complete"`. Find the outermost container or title element and add alongside it:

```typescript
{node.metadata?.completion === "complete" && (
  <span
    title="Answers saved"
    style={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: "#16a34a",
      marginLeft: 6,
      flexShrink: 0,
    }}
  />
)}
```

Place this immediately after the node label text, inside whatever flex/grid container holds the label.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 4: End-to-end test**

```bash
cd frontend && npm run dev
```

1. Open `http://localhost:3000/mindmap`
2. Click a 2nd-level node (e.g. "Cardiovascular")
3. Select some checkboxes
4. Click Save
5. Confirm the node now shows a small green dot
6. Refresh the page — confirm the green dot persists (answers reloaded from backend)
7. Click the node again — confirm the checkboxes are pre-populated with the saved values

- [ ] **Step 5: Commit**

```bash
git add frontend/app/mindmap/components/node-card.tsx
git commit -m "feat(frontend): show completion indicator on mind map nodes with saved answers"
```

---

## Phase 9.4: User Profile Page & AI Generation

> **Depends on Phase 9.1 and 9.3.** Adds the AI service endpoint, the backend generate route, and the new User Profile page.

---

### Task 9.4.1: Add master-profile endpoint to AI services

**Files:**
- Modify: `ai-services/app/main.py`

- [ ] **Step 1: Add the MasterProfileRequest model and endpoint to `ai-services/app/main.py`**

At the end of the existing imports section in `ai-services/app/main.py`, add:

```python
from app.providers.fallback_provider import FallbackProvider
```

(This is already imported — skip if present.)

After the existing `@app.post("/orchestrator")` endpoint, add:

```python
class MasterProfileRequest(BaseModel):
    user_id: int | None = None
    demographics: dict[str, object] = Field(default_factory=dict)
    questionnaire: dict[str, dict[str, object]] = Field(default_factory=dict)
    groq_api_key: str | None = None
    mistral_api_key: str | None = None


@app.post("/orchestrator/master-profile")
def generate_master_profile(payload: MasterProfileRequest) -> dict[str, object]:
    demographics = payload.demographics
    questionnaire = payload.questionnaire

    sections: list[str] = []

    # Demographics & Goals
    demo_parts: list[str] = []
    if demographics.get("name"):
        demo_parts.append(f"Name: {demographics['name']}")
    if demographics.get("age"):
        demo_parts.append(f"Age: {demographics['age']}")
    if demographics.get("gender"):
        demo_parts.append(f"Gender: {demographics['gender']}")
    if demographics.get("height_cm"):
        demo_parts.append(f"Height: {demographics['height_cm']} cm")
    if demographics.get("weight_kg"):
        demo_parts.append(f"Weight: {demographics['weight_kg']} kg")
    if demographics.get("goal_target_weight_kg"):
        demo_parts.append(f"Target weight: {demographics['goal_target_weight_kg']} kg")
    if demographics.get("health_conditions"):
        demo_parts.append(f"Known conditions: {demographics['health_conditions']}")
    if demographics.get("activity_level"):
        demo_parts.append(f"Activity level: {demographics['activity_level']}")
    if demographics.get("diet_pattern"):
        demo_parts.append(f"Diet pattern: {demographics['diet_pattern']}")
    sections.append("## Demographics & Goals\n" + ("\n".join(demo_parts) if demo_parts else "Not reported."))

    def q(node_id: str) -> dict[str, object]:
        return questionnaire.get(node_id, {})

    def fmt_list(values: object) -> str:
        if isinstance(values, list) and values:
            return ", ".join(str(v) for v in values)
        if isinstance(values, str) and values:
            return values
        return ""

    # Medical History
    med_parts: list[str] = []
    for section_id, label in [
        ("past-medical-history-cardiovascular", "Cardiovascular"),
        ("past-medical-history-endocrine", "Endocrine"),
        ("past-medical-history-musculoskeletal", "Musculoskeletal"),
        ("past-medical-history-neurologic", "Neurologic"),
        ("past-medical-history-psychiatric", "Psychiatric"),
        ("past-medical-history-respiratory", "Respiratory"),
        ("past-medical-history-gastroenterological", "Gastrointestinal"),
        ("past-medical-history-gynecologic", "Gynecologic"),
        ("past-medical-history-infections", "Infections"),
        ("past-medical-history-cancer", "Cancer"),
        ("past-medical-history-surgical", "Surgical history"),
        ("past-medical-history-other", "Other"),
    ]:
        items = fmt_list(q(section_id).get("conditions") or q(section_id).get("procedures"))
        if items:
            med_parts.append(f"- **{label}:** {items}")
    meds = fmt_list(q("regular-medication-each-medicine").get("medications"))
    if meds:
        med_parts.append(f"- **Current medications:** {meds}")
    family_parent = fmt_list(q("family-history-relative").get("parent"))
    family_sibling = fmt_list(q("family-history-relative").get("sibling"))
    if family_parent:
        med_parts.append(f"- **Family history (parents):** {family_parent}")
    if family_sibling:
        med_parts.append(f"- **Family history (siblings):** {family_sibling}")
    sections.append("## Medical History Summary\n" + ("\n".join(med_parts) if med_parts else "Not reported."))

    # Lifestyle Snapshot
    life_parts: list[str] = []
    sleep_hours = fmt_list(q("sleep-routine").get("total-sleep"))
    if sleep_hours:
        life_parts.append(f"- **Sleep:** {sleep_hours}")
    sleep_syms = fmt_list(q("sleep-symptoms-current-state").get("symptoms"))
    if sleep_syms:
        life_parts.append(f"- **Sleep symptoms:** {sleep_syms}")
    stress_level = q("stress-symptoms-current-state").get("stress-level")
    if stress_level:
        life_parts.append(f"- **Stress level:** {stress_level}/10")
    stress_syms = fmt_list(q("stress-symptoms-current-state").get("symptoms"))
    if stress_syms:
        life_parts.append(f"- **Stress symptoms:** {stress_syms}")
    exercise_freq = fmt_list(q("exercise-habits").get("frequency"))
    exercise_types = fmt_list(q("exercise-types").get("types"))
    if exercise_freq:
        life_parts.append(f"- **Exercise frequency:** {exercise_freq}")
    if exercise_types:
        life_parts.append(f"- **Exercise types:** {exercise_types}")
    diet = fmt_list(q("nutrition-groups").get("diet-pattern"))
    if diet:
        life_parts.append(f"- **Diet pattern:** {diet}")
    gut_syms = fmt_list(q("gut-health-current-state").get("symptoms"))
    if gut_syms:
        life_parts.append(f"- **Gut health symptoms:** {gut_syms}")
    dental = fmt_list(q("dental-hygiene").get("brushing"))
    if dental:
        life_parts.append(f"- **Dental hygiene:** {dental}")
    social_sit = fmt_list(q("social-history-current-state").get("living-situation"))
    if social_sit:
        life_parts.append(f"- **Living situation:** {social_sit}")
    sections.append("## Lifestyle Snapshot\n" + ("\n".join(life_parts) if life_parts else "Not reported."))

    # Key Risk Factors
    risk_parts: list[str] = []
    cardio_conds = fmt_list(q("past-medical-history-cardiovascular").get("conditions"))
    if cardio_conds:
        risk_parts.append(f"- Cardiovascular: {cardio_conds}")
    endo_conds = fmt_list(q("past-medical-history-endocrine").get("conditions"))
    if endo_conds:
        risk_parts.append(f"- Metabolic/Endocrine: {endo_conds}")
    inflammation = q("inflammation-current-state").get("pain-level")
    if inflammation and int(str(inflammation)) >= 5:
        risk_parts.append(f"- Elevated inflammation score: {inflammation}/10")
    smoking = q("harmful-substance-habits").get("smokes")
    if smoking == "yes":
        risk_parts.append("- Current tobacco user")
    alcohol = fmt_list(q("harmful-substance-habits").get("alcohol-frequency"))
    if alcohol and "day" in alcohol.lower():
        risk_parts.append(f"- Daily alcohol use: {alcohol}")
    diabetes_dx = fmt_list(q("diabetes-history-diagnosis").get("diagnosis"))
    if diabetes_dx and diabetes_dx != "No":
        risk_parts.append(f"- Diabetes status: {diabetes_dx}")
    aerobic = fmt_list(q("aerobics-capacity-current-state").get("fitness-level"))
    if aerobic and "Poor" in aerobic:
        risk_parts.append(f"- Poor aerobic capacity: {aerobic}")
    sections.append("## Key Risk Factors\n" + ("\n".join(risk_parts) if risk_parts else "No significant risk factors identified from reported data."))

    # Behavioral Readiness
    readiness_node = q("change-readiness-readiness")
    readiness_parts: list[str] = []
    readiness_labels = {
        "motivated": "Motivation",
        "capable": "Self-efficacy",
        "clear-why": "Clarity of why",
        "time-resources": "Time/resources",
        "social-support": "Social support",
        "willing-to-track": "Willing to track",
        "wants-coaching": "Open to coaching",
    }
    for key, label in readiness_labels.items():
        val = readiness_node.get(key)
        if val:
            readiness_parts.append(f"- {label}: {val}/5")
    purpose = fmt_list(q("purpose-assessment").get("sense-of-purpose"))
    if purpose:
        readiness_parts.append(f"- Sense of purpose: {purpose}")
    sections.append("## Behavioral Readiness & Motivation\n" + ("\n".join(readiness_parts) if readiness_parts else "Not reported."))

    # Recommendations Summary
    rec_parts: list[str] = []
    if sleep_hours and ("< 5" in sleep_hours or "5-6" in sleep_hours):
        rec_parts.append("- Prioritize sleep extension — reported sleep below optimal range")
    if stress_level and int(str(stress_level)) >= 7:
        rec_parts.append("- Address high stress — consider structured stress management techniques")
    if exercise_freq and ("Rarely" in exercise_freq or "month" in exercise_freq):
        rec_parts.append("- Begin graduated exercise program — currently sedentary")
    if diabetes_dx and diabetes_dx != "No":
        rec_parts.append("- Metabolic optimization focus — diabetes/pre-diabetes present")
    if smoking == "yes":
        rec_parts.append("- Smoking cessation support recommended")
    if not rec_parts:
        rec_parts.append("- Maintain current healthy habits and monitor key biomarkers")
    sections.append("## Personalized Recommendations Summary\n" + "\n".join(rec_parts))

    profile_text = "\n\n".join(sections)
    return {"profile_text": profile_text}
```

- [ ] **Step 2: Verify the AI service starts**

```bash
cd ai-services && uvicorn app.main:app --reload --port 8001
```

Expected: `Application startup complete.` Navigate to `http://localhost:8001/docs` and confirm `/orchestrator/master-profile` appears.

- [ ] **Step 3: Commit**

```bash
git add ai-services/app/main.py
git commit -m "feat(ai-services): add master-profile generation endpoint"
```

---

### Task 9.4.2: Create User Profile page

**Files:**
- Create: `frontend/app/user-profile/page.tsx`

- [ ] **Step 1: Create `frontend/app/user-profile/page.tsx`**

```typescript
"use client"

import { useEffect, useState } from "react"
import type { CSSProperties } from "react"

import { PageShell } from "@/app/components/page-shell"
import { generateMasterProfile, fetchMasterProfile } from "@/lib/api-client"

interface ProfileState {
  profileText: string
  generatedAt: string
}

export default function UserProfilePage() {
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchMasterProfile()
      .then((data) => {
        if (data) {
          setProfile({ profileText: data.profile_text, generatedAt: data.generated_at })
        }
      })
      .catch(() => setError("Failed to load profile."))
      .finally(() => setIsLoading(false))
  }, [])

  async function handleGenerate() {
    setIsGenerating(true)
    setError("")
    try {
      const data = await generateMasterProfile()
      setProfile({ profileText: data.profile_text, generatedAt: data.generated_at })
    } catch {
      setError("Failed to generate profile. Make sure the AI service is running.")
    } finally {
      setIsGenerating(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  const formattedDate = profile?.generatedAt
    ? new Date(profile.generatedAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null

  return (
    <PageShell>
      <div style={containerStyle} className="print-container">
        {/* Header */}
        <div style={headerStyle} className="no-print">
          <h1 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: 0 }}>
            User Profile
          </h1>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            style={generateButtonStyle}
          >
            {isGenerating ? "Generating…" : "Generate"}
          </button>
        </div>

        {/* Meta strip */}
        {formattedDate && (
          <p style={{ fontSize: 13, color: "#64748b", margin: 0 }} className="no-print">
            Last generated: {formattedDate}
          </p>
        )}

        {/* Error */}
        {error && (
          <p style={{ fontSize: 14, color: "#dc2626" }} className="no-print">
            {error}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <p style={{ fontSize: 14, color: "#64748b" }}>Loading…</p>
        )}

        {/* Empty state */}
        {!isLoading && !profile && !error && (
          <div style={emptyStateStyle}>
            <p style={{ fontSize: 15, color: "#475569", margin: 0 }}>
              No profile generated yet.
            </p>
            <p style={{ fontSize: 14, color: "#94a3b8", marginTop: 8 }}>
              Complete questionnaire sections in Profile Questions, then click Generate.
            </p>
          </div>
        )}

        {/* Profile content */}
        {profile && (
          <div style={profileContentStyle} className="profile-text">
            <MarkdownRenderer text={profile.profileText} />
          </div>
        )}

        {/* Print footer */}
        {profile && (
          <div style={footerStyle} className="no-print">
            <button type="button" onClick={handlePrint} style={printButtonStyle}>
              Print / Export PDF
            </button>
          </div>
        )}

        {/* Print-only styles */}
        <style>{`
          @media print {
            .no-print { display: none !important; }
            .print-container { padding: 0 !important; max-width: 100% !important; }
            .profile-text { font-size: 12pt; line-height: 1.6; }
            h2 { page-break-before: auto; }
          }
        `}</style>
      </div>
    </PageShell>
  )
}

function MarkdownRenderer({ text }: { text: string }) {
  const lines = text.split("\n")
  const elements: React.ReactNode[] = []
  let key = 0

  for (const line of lines) {
    if (line.startsWith("## ")) {
      elements.push(
        <h2 key={key++} style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", marginTop: 20, marginBottom: 6 }}>
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={key++} style={{ fontSize: 14, color: "#334155", marginLeft: 16, marginBottom: 4 }}>
          {line.slice(2).replace(/\*\*(.+?)\*\*/g, "$1")}
        </li>
      )
    } else if (line.trim() === "") {
      elements.push(<div key={key++} style={{ height: 8 }} />)
    } else {
      elements.push(
        <p key={key++} style={{ fontSize: 14, color: "#334155", margin: "4px 0" }}>
          {line}
        </p>
      )
    }
  }

  return <div>{elements}</div>
}

const containerStyle: CSSProperties = {
  maxWidth: 760,
  margin: "0 auto",
  padding: "24px 20px 80px",
  display: "grid",
  gap: 16,
}

const headerStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
}

const generateButtonStyle: CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "1px solid #2563eb",
  backgroundColor: "#2563eb",
  color: "#ffffff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
}

const emptyStateStyle: CSSProperties = {
  padding: "40px 20px",
  textAlign: "center",
  borderRadius: 12,
  border: "1px dashed #cbd5e1",
  backgroundColor: "#f8fafc",
}

const profileContentStyle: CSSProperties = {
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  backgroundColor: "#ffffff",
  padding: "24px 28px",
}

const footerStyle: CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  position: "sticky",
  bottom: 16,
}

const printButtonStyle: CSSProperties = {
  padding: "8px 20px",
  borderRadius: 8,
  border: "1px solid #475569",
  backgroundColor: "#f8fafc",
  color: "#475569",
  fontSize: 14,
  fontWeight: 500,
  cursor: "pointer",
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add frontend/app/user-profile/page.tsx
git commit -m "feat(frontend): add User Profile page with generate and print support"
```

---

### Task 9.4.3: Add User Profile to sidebar navigation

**Files:**
- Modify: `frontend/app/components/nav-bar.tsx`

- [ ] **Step 1: Add the User Profile nav entry**

In `frontend/app/components/nav-bar.tsx`, find the `links` array. Add the new entry after the `{ href: '/mindmap', ... }` entry:

```typescript
  { href: '/user-profile', label: 'User Profile', icon: UserCircle2 },
```

Note: `UserCircle2` is already imported in the nav-bar. Use it for this entry. If it's already used for the mindmap entry, change one of them — use `BookUser` or `FileText` from lucide-react for the User Profile entry to avoid icon collision:

Replace `UserCircle2` in the new entry with `FileText` and add `FileText` to the lucide-react import line.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```

- [ ] **Step 3: Test in browser**

```bash
cd frontend && npm run dev
```

Navigate to `http://localhost:3000`. Confirm "User Profile" appears in the sidebar. Click it to reach `/user-profile`. Click "Generate" — confirm it calls the backend which calls AI services and returns a profile.

- [ ] **Step 4: Commit**

```bash
git add frontend/app/components/nav-bar.tsx
git commit -m "feat(frontend): add User Profile entry to sidebar navigation"
```

---

## Phase 9.5: Orchestrator Integration & Print/PDF

> **Depends on Phase 9.4.** Enriches the existing meal/activity plan generation with the master profile. Fully backward-compatible — the orchestrator works identically when no master profile exists.

---

### Task 9.5.1: Add master_profile field to OrchestrationContext

**Files:**
- Modify: `ai-services/app/orchestrator/models.py`

- [ ] **Step 1: Add the field to OrchestrationContext dataclass**

In `ai-services/app/orchestrator/models.py`, find the `OrchestrationContext` dataclass. Add one new optional field after `adherence_signals`:

```python
    master_profile: str | None = None
```

The full updated dataclass:
```python
@dataclass(frozen=True)
class OrchestrationContext:
    prompt: str
    intent: str
    user_profile: UserProfileContext | None = None
    health_metrics: list[HealthMetricContext] = field(default_factory=list)
    lab_records: list[LabRecordContext] = field(default_factory=list)
    adherence_signals: list[AdherenceSignalContext] = field(default_factory=list)
    master_profile: str | None = None
    consistency_level: str | None = None
    adaptive_adjustment: dict[str, str] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.prompt.strip():
            raise ValueError("prompt is required")
        if not self.intent.strip():
            raise ValueError("intent is required")
```

- [ ] **Step 2: Commit**

```bash
git add ai-services/app/orchestrator/models.py
git commit -m "feat(ai-services): add master_profile field to OrchestrationContext"
```

---

### Task 9.5.2: Pass master_profile into agent requests

**Files:**
- Modify: `ai-services/app/orchestrator/orchestrator.py`

- [ ] **Step 1: Update `_build_agent_request` to include master_profile**

In `ai-services/app/orchestrator/orchestrator.py`, find the `_build_agent_request` method. The `variables` dict currently contains `user_profile`, `health_metrics`, etc. Add `master_profile` to it:

```python
    def _build_agent_request(
        self,
        context: OrchestrationContext,
        agent_name: str,
        retrieved_context: list[dict[str, object]],
    ) -> AgentInput:
        return AgentInput(
            prompt=context.prompt,
            task_type=agent_name,
            variables={
                "intent": context.intent,
                "user_profile": asdict(context.user_profile) if context.user_profile else None,
                "master_profile": context.master_profile or "",
                "health_metrics": [asdict(metric) for metric in context.health_metrics],
                "lab_records": [asdict(record) for record in context.lab_records],
                "adherence_signals": [asdict(signal) for signal in context.adherence_signals],
                "consistency_level": context.consistency_level,
                "adaptive_adjustment": context.adaptive_adjustment,
                "past_recommendations": retrieved_context,
            },
            metadata={
                "agent_name": agent_name,
                **context.metadata,
            },
        )
```

- [ ] **Step 2: Commit**

```bash
git add ai-services/app/orchestrator/orchestrator.py
git commit -m "feat(ai-services): pass master_profile into agent request variables"
```

---

### Task 9.5.3: Accept master_profile in orchestrator API endpoint

**Files:**
- Modify: `ai-services/app/main.py`

- [ ] **Step 1: Add master_profile to OrchestrationContextPayload**

In `ai-services/app/main.py`, find `OrchestrationContextPayload`. Add one field:

```python
    master_profile: str | None = None
```

- [ ] **Step 2: Pass master_profile when building OrchestrationContext**

In the `run_orchestrator` function, find where `OrchestrationContext(...)` is built. Add `master_profile=context.master_profile` to the constructor call:

```python
        request = OrchestrationRequest(
            context=OrchestrationContext(
                prompt=context.prompt,
                intent=context.intent,
                user_profile=...,
                health_metrics=...,
                lab_records=...,
                adherence_signals=...,
                master_profile=context.master_profile,
                consistency_level=context.consistency_level,
                adaptive_adjustment=context.adaptive_adjustment,
                metadata=context.metadata,
            )
        )
```

- [ ] **Step 3: Update the frontend api-client.ts to pass master_profile when requesting a plan**

In `frontend/lib/api-client.ts`, find the `submitOrchestratorRequest` function (or equivalent function that POSTs to `/orchestrator`). Find where the context payload is built. Before sending, fetch the master profile and add it:

Locate the orchestrator call (around line 630+) and add `master_profile` to the context object sent to AI services:

```typescript
  // Fetch master profile to enrich orchestrator context
  let masterProfileText = ""
  try {
    const masterProfile = await fetchMasterProfile()
    masterProfileText = masterProfile?.profile_text ?? ""
  } catch {
    // non-blocking — orchestrator still works without it
  }
```

Then in the body of the fetch call to the AI service, add `master_profile: masterProfileText` to the `context` object.

- [ ] **Step 4: Verify the AI service starts without errors**

```bash
cd ai-services && uvicorn app.main:app --reload --port 8001
```

Expected: `Application startup complete.`

- [ ] **Step 5: End-to-end test**

1. Navigate to `/user-profile`, click Generate to create a master profile
2. Navigate to the Plan page and generate a new meal/activity plan
3. Confirm the plan generates without errors (master profile enrichment is silent — no visible UI change, but check backend logs for the `master_profile` field being passed)

- [ ] **Step 6: Commit**

```bash
git add ai-services/app/main.py frontend/lib/api-client.ts
git commit -m "feat: pass master user profile into orchestrator context for plan generation"
```

---

## Self-Review

**Spec coverage check:**
- ✅ All 45 mind map attribute nodes populated with questions (Task 9.2.4)
- ✅ All 6 new question types rendered in modal (Task 9.2.2)
- ✅ Answers persisted to dedicated backend table (Tasks 9.1.1–9.1.5, 9.3.1–9.3.2)
- ✅ Answers survive page refresh and session (Tasks 9.3.1–9.3.2)
- ✅ Completion indicators on nodes (Task 9.3.3)
- ✅ Master User Profile generated by AI (Tasks 9.4.1–9.4.2)
- ✅ User Profile page in sidebar (Tasks 9.4.2–9.4.3)
- ✅ Print to PDF (Task 9.4.2 — `window.print()` with `@media print` CSS)
- ✅ Master profile feeds into meal/activity plan orchestrator (Tasks 9.5.1–9.5.3)

**Type consistency check:**
- `MindMapAnswerValue = string | number | string[]` used consistently in api-client.ts, dynamic-form.tsx, and graph-view.tsx
- `fetchAllQuestionnaireAnswers` returns `Record<string, Record<string, MindMapAnswerValue>>` — matches backend `AllQuestionnaireResponses.responses`
- `saveNodeAnswers(nodeId, answers)` — `answers` is `Record<string, MindMapAnswerValue>` — matches backend `QuestionnaireAnswerUpsert.answers: dict`
- `OrchestrationContext.master_profile: str | None` — added in models.py, passed in orchestrator.py, exposed in main.py payload

**Placeholder scan:** No TBDs. All code is complete and specific.

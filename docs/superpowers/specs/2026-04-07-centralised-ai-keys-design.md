# Centralised AI API Key Management — Design Spec

**Date:** 2026-04-07
**Status:** Approved
**Scope:** Remove user-managed AI API keys; consolidate all AI calls through a server-side central proxy with multi-provider cost-aware routing and per-user token budgets.

---

## Problem Statement

Currently users must obtain and store their own Groq and Mistral API keys in browser `localStorage`. Keys flow through the full request chain (browser → Next.js → backend → ai-services). This is poor UX, a security smell, and incompatible with a commercial SaaS model where the founder pays AI bills and controls costs.

---

## Goals

1. All AI API keys live server-side only — users never see or manage them.
2. A single place in the backend manages provider config (env vars, overridden by DB for admin console).
3. Multi-provider support with cost-aware routing and automatic failover.
4. Per-user monthly token budgets enforced at the backend, tiered by subscription plan.
5. Frontend AI features are always available — no key-presence gates.

---

## Architecture

```
Browser
  │
  ├─ POST /api/v1/ai/meal-plan
  ├─ POST /api/v1/ai/parse-lab
  └─ POST /api/v1/user-profile/generate  (existing, unchanged flow)
                │
                ▼
     FastAPI Backend :8000
     ├─ Authenticates user (JWT)
     ├─ Checks token budget (Postgres)
     ├─ Forwards to ai-services
     └─ Deducts tokens from budget (fire-and-forget after response)
                │
                ▼
     ai-services :8001
     ├─ Loads provider config (env vars → Postgres override)
     ├─ Cost-aware router selects provider for task type
     ├─ Calls Groq or Mistral with server-held key
     └─ Returns result + tokens_used
                │
                ▼
        Groq / Mistral APIs
```

**What is removed:**
- `frontend/lib/ai-keys.ts`
- `frontend/app/api/meal-plan/route.ts`
- `frontend/app/api/parse-lab/route.ts`
- All `x-groq-key` / `x-mistral-key` headers from the request chain
- Settings page "AI API Keys" card
- All `groq_api_key` / `mistral_api_key` fields from ai-services request schemas

---

## Database Schema

### `ai_token_budgets`

Tracks per-user monthly token consumption. One row per user per calendar month.

```sql
CREATE TABLE ai_token_budgets (
    id          SERIAL PRIMARY KEY,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    period      VARCHAR(7) NOT NULL,   -- "YYYY-MM", e.g. "2026-04"
    tokens_used INTEGER NOT NULL DEFAULT 0,
    tokens_limit INTEGER NOT NULL,     -- set from user tier at row creation
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, period)
);
```

**Token limits by tier:**
- Free: 50,000 tokens/month
- Pro: 500,000 tokens/month

Period is calendar-month based (resets on the 1st). If no row exists for the current period, one is created on first AI call using the user's current tier limit.

### `ai_provider_config`

Admin-managed provider configuration. Rows here override environment variable defaults. When this table has active rows, ai-services uses them; when empty, falls back to env vars.

```sql
CREATE TABLE ai_provider_config (
    id                  SERIAL PRIMARY KEY,
    provider_name       VARCHAR(50) NOT NULL UNIQUE,  -- "groq", "mistral"
    api_key_encrypted   TEXT NOT NULL,                -- Fernet-encrypted
    cost_per_1k_tokens  FLOAT NOT NULL DEFAULT 0.0,
    task_assignments    JSONB NOT NULL DEFAULT '{}',
    -- e.g. {"meal_plan": true, "parse_lab": true, "master_profile": true, "orchestrator": true}
    is_active           BOOLEAN NOT NULL DEFAULT true,
    priority            INTEGER NOT NULL DEFAULT 0,   -- lower = preferred when cost ties
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## ai-services Changes

### New directory structure

```
ai-services/app/
├── config/
│   ├── provider_config.py     # ProviderConfig model + load_provider_config()
│   └── task_routing.py        # TASK_PROVIDER_MAP, load_task_routing()
├── routing/
│   └── cost_router.py         # CostAwareRouter: selects provider for task type
├── endpoints/
│   ├── meal_plan.py           # POST /ai/meal-plan
│   └── parse_lab.py           # POST /ai/parse-lab
└── (existing files unchanged)
```

### Provider Config Loading (`config/provider_config.py`)

ai-services connects directly to the shared Postgres instance via its own `POSTGRES_URL` env var (same database, read-only access to `ai_provider_config`). No internal HTTP call to the backend is required.

```python
@dataclass
class ProviderConfig:
    name: str
    api_key: str
    cost_per_1k_tokens: float
    task_assignments: dict[str, bool]
    priority: int
    is_active: bool

def load_provider_config() -> list[ProviderConfig]:
    """
    1. Query ai_provider_config table for is_active=True rows.
    2. If rows found: decrypt api_key_encrypted, return ProviderConfig list.
    3. If table empty or DB unavailable: fall back to env vars (GROQ_API_KEY etc.)
    Config is loaded once at startup and cached. A future /admin/reload endpoint
    can trigger a reload without restart.
    """
```

**Environment variable bootstrap:**
```
GROQ_API_KEY=gsk_...
GROQ_COST_PER_1K_TOKENS=0.0
GROQ_TASKS=meal_plan,parse_lab,master_profile,orchestrator

MISTRAL_API_KEY=...
MISTRAL_COST_PER_1K_TOKENS=0.002
MISTRAL_TASKS=master_profile,orchestrator
```

### Task Routing (`config/task_routing.py`)

Maps task types to their configured providers. Overridable via env vars or DB.

Task types: `meal_plan`, `parse_lab`, `master_profile`, `orchestrator`

### Cost-Aware Router (`routing/cost_router.py`)

```python
class CostAwareRouter:
    def select_provider(self, task_type: str) -> ProviderConfig:
        """
        1. Filter providers assigned to this task_type and is_active=True
        2. Exclude providers currently health-flagged (rate-limited / erroring)
        3. Sort by cost_per_1k_tokens ASC, then priority ASC
        4. Return first; raise NoProviderAvailableError if list empty
        """

    def mark_unhealthy(self, provider_name: str, reason: str) -> None:
        """In-memory health flag; clears after 24h."""
```

### New Endpoints

**`POST /ai/meal-plan`**

Request:
```json
{ "user_prompt": "...", "profile_summary": "..." }
```

Response:
```json
{
  "meals": [...],
  "provider_used": "groq",
  "tokens_used": 1240
}
```

**`POST /ai/parse-lab`**

Request: `multipart/form-data` — `file` (image or PDF), `service_date` (optional)

Response:
```json
{
  "records": [...],
  "service_date": "2026-03-15",
  "provider_used": "groq",
  "tokens_used": 890
}
```

### Existing Endpoint Changes

- `/orchestrator` and `/orchestrator/master-profile` — remove `groq_api_key` and `mistral_api_key` from `OrchestrationContextPayload` and `MasterProfileRequest`. These fields are deleted, not deprecated. All responses now include `tokens_used`.
- `FallbackProvider` is replaced by `CostAwareRouter` + provider registry. The `FallbackProvider` class is removed.

---

## Backend Changes

### New Service: `AIProxyService` (`backend/app/services/ai_proxy_service.py`)

Handles all AI call proxying with budget enforcement.

```python
class AIProxyService:
    def check_and_reserve_budget(
        self, session: Session, user: User, estimated_tokens: int = 100
    ) -> AITokenBudget:
        """
        - Get or create budget row for current period
        - Raise HTTP 429 with clear message if tokens_used >= tokens_limit
        - Return budget row
        """

    def deduct_tokens(
        self, session: Session, budget: AITokenBudget, tokens_used: int
    ) -> None:
        """Update tokens_used. Called after successful AI response."""

    def forward_meal_plan(
        self, user: User, user_prompt: str, profile_summary: str
    ) -> dict:
        """POST to ai-services /ai/meal-plan, return response."""

    def forward_parse_lab(
        self, user: User, file: bytes, filename: str, mime_type: str,
        service_date: str | None
    ) -> dict:
        """POST multipart to ai-services /ai/parse-lab, return response."""
```

### New Model: `AITokenBudget` (`backend/app/models/ai_budget.py`)

SQLAlchemy model mapping to `ai_token_budgets` table.

### New Alembic Migration

Two migrations:
1. Create `ai_token_budgets` table
2. Create `ai_provider_config` table

### New Backend Endpoints

**`POST /api/v1/ai/meal-plan`** (`backend/app/api/v1/endpoints/ai_proxy.py`)

- Auth required (JWT)
- Check token budget
- Forward to ai-services
- Deduct tokens
- Return meal plan to browser

**`POST /api/v1/ai/parse-lab`** (`backend/app/api/v1/endpoints/ai_proxy.py`)

- Auth required (JWT)
- Check token budget
- Forward multipart file to ai-services
- Deduct tokens
- Return parsed lab records to browser

### Modified Files

**`backend/app/services/questionnaire_service.py`**
- Remove `groq_key: str | None` and `mistral_key: str | None` params from `generate_master_profile()`
- Remove key fields from the ai-services HTTP request body

**`backend/app/api/v1/endpoints/questionnaire.py`**
- Remove `x-groq-key` and `x-mistral-key` header extraction
- Remove key params from `generate_master_profile()` call

**`backend/app/core/config.py`**
- Add `groq_api_key`, `mistral_api_key`, `groq_cost_per_1k`, `mistral_cost_per_1k` settings (read from env, forwarded to ai-services on startup health-check or passed via internal service call)

---

## Frontend Changes

### Deleted Files
- `frontend/lib/ai-keys.ts`
- `frontend/app/api/meal-plan/route.ts`
- `frontend/app/api/parse-lab/route.ts`

### Modified: `frontend/lib/api-client.ts`
- Remove `import { getGroqKey, getMistralKey } from './ai-keys'`
- Remove `groq_api_key` / `mistral_api_key` from orchestrator request body
- Add `callMealPlan(userPrompt: string, profileSummary: string): Promise<MealPlanResponse>`
  - `POST /api/v1/ai/meal-plan` with JWT auth header
- Add `parseLabFile(file: File, serviceDate: string | null): Promise<ParseLabResponse>`
  - `POST /api/v1/ai/parse-lab` multipart with JWT auth header

### Modified: `frontend/app/settings/page.tsx`
- Remove the "AI API Keys" section (Groq key input, Mistral key input, show/hide toggles, save/clear buttons, `bothSet` state, all related state variables)
- Keep remaining settings (gender, profile, etc.)

### Modified: `frontend/app/plan/meals/page.tsx`
- Remove `getGroqKey()` / `getMistralKey()` / `hasAiKeys()` usage
- Replace call to `/api/meal-plan` with `callMealPlan()` from api-client
- Remove "add API keys in Settings" warning/gate

### Modified: `frontend/app/lab-test/page.tsx`
- Remove `getGroqKey()` / `getMistralKey()` / `hasAiKeys()` usage
- Remove `x-groq-key` / `x-mistral-key` headers from fetch call
- Replace call to `/api/parse-lab` with `parseLabFile()` from api-client
- Remove "add API keys in Settings" warning/gate

### Modified: `frontend/app/onboarding/components/onboarding-form.tsx` + `frontend/app/components/interaction.tsx`
- Remove any `hasAiKeys()` guards gating AI features

---

## Token Budget Error Handling

When a user's token budget is exhausted:
- Backend returns `HTTP 429` with body: `{ "detail": "Monthly AI usage limit reached. Upgrade to Pro for more." }`
- Frontend shows a clear, friendly message (not a generic error)
- Free users see an upgrade prompt; Pro users see a "limit reached, resets on [date]" message

---

## Security Considerations

- API keys in `ai_provider_config` are Fernet-encrypted at rest. The encryption key is stored as `AI_CONFIG_ENCRYPTION_KEY` env var (never in DB).
- ai-services is an internal service — not exposed to the public internet. Only the FastAPI backend calls it.
- No API key ever appears in logs, error messages, or HTTP responses.

---

## Future: Admin Console Integration

The `ai_provider_config` table is the foundation for the admin console. The admin console will:
- CRUD providers and their keys (encrypted)
- Adjust task-type → provider assignments
- View token consumption per user and per provider
- Set per-tier token limits

No admin console work is in scope for this spec.

---

## Success Criteria

1. No user ever sees, enters, or manages an API key.
2. All three AI features (meal plan, lab parse, master profile / orchestrator) work without user-provided keys.
3. Token budget is enforced — a user who exhausts their monthly budget gets a clear `429` response.
4. Adding a new AI provider in the future requires only: a new row in `ai_provider_config` (or env vars) and a new `ProviderConfig` entry — no frontend changes.
5. All existing tests pass; new unit tests cover `CostAwareRouter`, `AIProxyService.check_and_reserve_budget()`, and the two new backend endpoints.

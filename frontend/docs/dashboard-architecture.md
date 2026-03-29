# Frontend Architecture

## Purpose

Define the Next.js dashboard layer that presents application state, collects user input, and visualizes generated outputs. The frontend is responsible for user experience and client-side workflow coordination only. Business rules, AI decisions, persistence, and background execution remain outside this layer.

## Architectural Style

- Framework: Next.js with App Router
- Primary role: authenticated dashboard application
- Rendering model: server-rendered layout and page shells, client components only where interactivity is required
- State model: keep server state aligned with backend responses; keep local state limited to form state, UI state, and view-specific interactions

## Top-Level Structure

- `app/`
  - Route groups for major dashboard areas
  - Shared layouts for authenticated and public sections
  - Page-level loading, error, and empty states
- `components/`
  - Reusable presentation components
  - Feature-scoped UI components for onboarding, plans, labs, and progress views
- `features/`
  - View models and feature-local state orchestration
  - Request formatting and response normalization for frontend use
- `lib/`
  - Backend API client
  - Authentication/session helpers
  - Shared formatting utilities
- `docs/`
  - Frontend architecture documentation

## Core Responsibilities

- Render dashboard pages for onboarding, plan review, lab insights, and adaptive updates
- Submit validated user input to the backend
- Poll or subscribe to task status when long-running backend operations are in progress
- Display generated plans, analysis summaries, and update history
- Provide clear UX states for pending, completed, failed, and stale data

## Explicit Non-Responsibilities

- No direct database access
- No direct vector search calls
- No direct AI provider access
- No business rule ownership for plan generation or analysis logic
- No background job execution

## Feature Boundaries

### Onboarding

- Collect profile, goals, preferences, and uploaded inputs
- Submit onboarding package to backend
- Show progress while backend coordinates persistence and asynchronous work

### Plan Workspace

- Display current plan, rationale summary, and status
- Allow user review and confirmation interactions
- Trigger refresh or regeneration requests through backend only

### Lab Insights

- Show parsed lab results, flagged findings, and AI-generated interpretation summaries
- Keep raw ingestion and interpretation logic outside the frontend

### Adaptive Updates

- Present change history, detected triggers, and revised recommendations
- Surface what changed and why using backend-provided summaries

## Interaction Pattern: Frontend to Backend

- Frontend communicates only with FastAPI over authenticated HTTP APIs
- Requests are organized around feature actions, not database entities
- Long-running actions return an accepted state plus a task identifier or operation status reference
- Frontend reads task progress through backend-facing status endpoints or refresh cycles
- Frontend never calls Celery, Redis, Postgres, Vector DB, or the AI layer directly

## UI Composition Principles

- Keep pages feature-oriented instead of deeply component-driven
- Prefer a small number of shared layout and feedback primitives
- Keep forms close to the route or feature that owns them
- Keep frontend logic thin by treating backend responses as the source of truth

## Scalability Guidance

- Add new dashboard areas as new route groups or feature modules
- Reuse the same backend-client pattern for all server interactions
- Keep cross-feature UI shared only when clearly repeated
- Avoid introducing frontend service layers unless multiple features require the same orchestration logic

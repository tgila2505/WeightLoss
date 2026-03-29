# Backend Architecture

## Purpose

Define the FastAPI application as a modular monolith that owns API handling, application rules, orchestration entry points, persistence coordination, and asynchronous job triggering. The backend is the single system boundary for the frontend.

## Architectural Style

- Framework: FastAPI
- Structure: modular monolith
- Primary role: application boundary and business workflow coordinator
- Deployment unit: one backend application, internally divided into modules

## Module Layout

- `api/`
  - Route handlers grouped by feature area
  - Request parsing and response shaping only
- `modules/`
  - Feature modules such as onboarding, plans, labs, and adaptive-updates
  - Each module owns its application services, domain rules, and repository interfaces
- `shared/`
  - Authentication, authorization, common validation, error handling, and shared contracts
- `integrations/`
  - AI client adapters
  - Async task dispatch adapters
  - Data access implementations
- `docs/`
  - Backend architecture documentation

## Responsibility Boundaries

### API Layer

- Accept requests from the frontend
- Enforce authentication and basic input validation
- Delegate work to module-level application services
- Return synchronous results or asynchronous operation states

### Application Services

- Coordinate feature workflows
- Apply business rules and sequencing
- Decide whether work is synchronous or queued
- Call data access, AI layer, and task dispatch components through internal interfaces

### Domain Rules

- Define feature-specific decision rules that belong to the product, not to transport or storage
- Remain independent from FastAPI request/response concerns

### Repository and Integration Adapters

- Isolate storage and external service details from feature logic
- Keep Postgres, Vector DB, AI layer, Redis, and Celery access out of route handlers

## Core Feature Modules

### Onboarding Module

- Owns user intake workflow and initial persistence
- Triggers any downstream plan-generation work after required onboarding data is complete

### Plans Module

- Owns plan retrieval, generation requests, and version tracking
- Coordinates plan generation with the AI layer

### Labs Module

- Owns lab intake, normalization trigger, analysis requests, and result retrieval
- Coordinates asynchronous lab analysis when needed

### Adaptive Updates Module

- Owns detection of relevant change events and update requests
- Coordinates plan revision workflows and records revision outcomes

## Interaction Pattern: Backend to Other Layers

### Backend to Frontend

- Synchronous pattern for reads and lightweight writes
- Accepted-task pattern for long-running operations
- Backend remains the only contract surface exposed to the dashboard

### Backend to AI Layer

- Backend sends structured feature requests to the AI Gateway
- Backend receives structured outputs for orchestration results, summaries, and reasoning artifacts suitable for storage
- Backend does not embed prompt routing logic inside feature modules

### Backend to Data Layer

- Postgres handles transactional records and canonical application state
- Vector DB is used only through backend-managed indexing and retrieval operations
- Backend decides when structured records and embeddings must be updated together

### Backend to Async Processing

- Backend enqueues background work through a task dispatch adapter
- Backend tracks job state in application-visible status records
- Backend never exposes Redis or Celery directly to the frontend

## Design Constraints

- No microservices split for feature ownership
- No feature-to-feature network calls inside the backend
- No AI-provider logic inside FastAPI routes
- No data access from frontend-facing route handlers beyond delegated services

## Minimal Scalability Approach

- Scale by adding modules, not services
- Keep module boundaries stable around product capabilities
- Move shared concerns into `shared/` only after actual duplication appears
- Reserve extraction into separate deployable services only if operational constraints force it later

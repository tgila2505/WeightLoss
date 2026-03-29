# AI Layer Architecture

## Purpose

Define a Python-based AI layer with a strict separation between the Gateway and the Orchestrator. This layer receives structured requests from the backend, applies AI workflow decisions, and returns structured outputs without owning product state.

## Architectural Style

- Runtime: Python service layer or package boundary
- Entry point: Gateway
- Decision layer: Orchestrator
- Ownership: AI request handling, prompt assembly, model routing, and output normalization

## Component Model

### Gateway

The Gateway is the single backend-facing entry point into the AI layer.

Responsibilities:

- Accept structured requests from backend modules
- Validate request shape and required context presence
- Apply common safety, tracing, and request metadata handling
- Forward requests to the Orchestrator using a stable internal contract
- Normalize responses into a predictable structure for the backend

Non-responsibilities:

- No feature-specific workflow decisions
- No persistence ownership
- No frontend access

### Orchestrator

The Orchestrator owns AI workflow decisions and internal routing.

Responsibilities:

- Determine the execution path for onboarding interpretation, plan generation, lab analysis, or adaptive updates
- Assemble the minimum required context for each AI task
- Choose the appropriate internal prompt or model strategy
- Request semantic retrieval when relevant context is needed
- Return structured outputs, confidence markers, and rationale summaries suitable for backend storage

Non-responsibilities:

- No direct user authentication
- No canonical data storage
- No direct task queue ownership

## Internal AI Work Units

Keep the Orchestrator minimal by organizing work around a small set of task types:

- Intake interpretation
- Plan generation
- Lab analysis
- Adaptive revision

Each task type can have its own prompt template and validation rules without becoming a separate service.

## Interaction Pattern: Backend to AI Layer

1. Backend module prepares a feature-specific request
2. Gateway validates and standardizes the request
3. Orchestrator determines the AI workflow path
4. Orchestrator optionally requests retrieval context
5. AI layer returns structured output to the backend
6. Backend decides what to persist, expose, or queue next

## Data Access Rules

- AI layer reads only the context it is explicitly given or retrieves through approved retrieval interfaces
- AI layer does not own direct writes to Postgres or Vector DB
- Any retrieval results remain supporting context, not canonical state

## Output Contract Principles

- Outputs must be structured for backend consumption
- Free-form narrative is acceptable only as a supporting explanation field
- Every AI result should be attributable to a specific task type and operation request

## Minimal Scalability Guidance

- Add new AI capabilities as new orchestrator task paths before considering service splits
- Keep the Gateway stable even as internal prompting evolves
- Centralize model routing in the Orchestrator to avoid scattering AI behavior across the backend

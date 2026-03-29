# System Flows

## Cross-Layer Interaction Model

### Frontend to Backend

- The Next.js dashboard sends authenticated feature requests to FastAPI
- FastAPI returns immediate results for lightweight operations and accepted-task responses for long-running work

### Backend to AI Layer

- FastAPI feature modules call the AI Gateway with structured business requests
- The AI Gateway forwards requests to the Orchestrator, which decides the AI execution path and returns normalized outputs

### Backend to Data Layer

- FastAPI writes and reads canonical records from Postgres
- FastAPI uses Vector DB only for semantic indexing and retrieval support

### Backend to Async Processing

- FastAPI enqueues long-running jobs through Celery using Redis as the broker
- Workers execute jobs and update canonical state in Postgres

## Flow 1: Onboarding

### Goal

Capture a new user profile and establish the initial application state required for plan creation.

### Steps

1. User completes onboarding in the Next.js dashboard
2. Frontend submits onboarding data to FastAPI
3. Backend validates the request and stores canonical onboarding records in Postgres
4. Backend determines whether follow-up processing is immediate or queued
5. If queued, backend creates an operation record and dispatches a Celery task through Redis
6. Worker performs any heavy intake interpretation and may request AI support through the Gateway and Orchestrator
7. Backend persists resulting onboarding summaries or readiness state in Postgres
8. Frontend reads updated onboarding status and next-step readiness from FastAPI

### Output

- Completed onboarding state
- User-ready status for plan generation

## Flow 2: Plan Generation

### Goal

Produce an initial or revised plan using stored user data and relevant contextual retrieval.

### Steps

1. User requests plan generation or the backend triggers it after onboarding completion
2. Backend gathers required structured context from Postgres
3. Backend optionally requests related semantic context through Vector DB-backed retrieval
4. Backend submits a plan-generation request to the AI Gateway
5. Gateway validates and forwards the request to the Orchestrator
6. Orchestrator assembles the final AI task context and generates a structured result
7. Backend stores the new plan version and summary in Postgres
8. If needed, backend triggers vector indexing for searchable plan content
9. Frontend retrieves the generated plan and displays status, rationale summary, and version information

### Output

- New plan version
- Plan summary suitable for dashboard display

## Flow 3: Lab Analysis

### Goal

Convert lab inputs into structured findings and user-facing insights.

### Steps

1. User uploads or submits lab information through the dashboard
2. Frontend sends the request to FastAPI
3. Backend stores the submitted lab record in Postgres
4. Backend dispatches asynchronous lab analysis if parsing or interpretation is non-trivial
5. Worker retrieves the lab record and prepares analysis context
6. Worker requests lab analysis through the AI Gateway and Orchestrator
7. AI layer returns structured findings and explanation summaries
8. Backend persists analysis results in Postgres and updates operation status
9. Frontend refreshes lab status and displays findings and interpretation summaries

### Output

- Structured lab analysis result
- User-visible insight summary

## Flow 4: Adaptive Updates

### Goal

Revise recommendations when new information materially changes the user context.

### Triggers

- New lab results
- Meaningful user progress changes
- Updated preferences or constraints
- Manual refresh request

### Steps

1. A new trigger event is recorded in the backend
2. Backend evaluates whether the trigger merits an adaptive update
3. If the update is required, backend creates an operation record and dispatches background work
4. Worker gathers current plan state, recent changes, and relevant semantic context
5. Worker requests adaptive revision through the AI Gateway and Orchestrator
6. AI layer returns a structured revision result and change rationale
7. Backend stores the revised plan version and update history in Postgres
8. Backend optionally refreshes related vector indexes
9. Frontend displays the updated recommendations and what changed

### Output

- Revised plan version
- Change rationale and update history

## System Boundary Summary

- Frontend owns user interaction and presentation
- Backend owns business workflows and system coordination
- AI layer owns AI decision routing and output generation
- Postgres owns canonical state
- Vector DB owns semantic retrieval projections
- Celery and Redis own background execution transport and processing

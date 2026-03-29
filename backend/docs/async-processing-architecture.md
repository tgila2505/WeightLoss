# Async Processing Architecture

## Purpose

Define the minimal background processing model for operations that are too slow or expensive for request-response handling.

## Components

- FastAPI trigger layer
- Redis broker
- Celery workers

## Responsibilities by Component

### FastAPI Trigger Layer

- Accept user-initiated or system-initiated requests that require background execution
- Persist request state in Postgres before queueing work
- Enqueue Celery tasks with a stable business reference
- Return an accepted response and status reference to the caller

### Redis Broker

- Carry task messages between FastAPI and Celery
- Remain transport-only, with no business state ownership

### Celery Workers

- Execute background jobs such as plan generation, lab analysis, embedding refresh, and adaptive update recalculation
- Read required state through backend-owned data access and integration adapters
- Persist outcomes, failures, and completion state back through application logic

## Suitable Async Workloads

- AI generation or analysis that may exceed normal request latency
- Large document or lab parsing pipelines
- Vector indexing and re-indexing
- Batch recalculation for adaptive updates

## Non-Async Workloads

- Small reads for dashboard display
- Simple state transitions that complete safely within normal API latency
- Lightweight validation and request admission checks

## Workflow Pattern

1. Backend receives a request
2. Backend validates and stores operation intent
3. Backend publishes a Celery task via Redis
4. Worker executes the job and updates application state
5. Frontend polls or refreshes through backend APIs to observe status and results

## Failure Handling Model

- Worker failures are recorded as application-visible statuses
- Retries are limited to transient failures only
- Irrecoverable failures return the operation to a reviewable failed state instead of hiding the error

## Boundary Rules

- Frontend never interacts with Redis or Celery directly
- Workers do not expose APIs
- Redis does not store long-term business truth
- Celery tasks are thin execution units around module-owned application workflows

## Minimal Scalability Guidance

- Keep one broker and one worker system for all background workloads initially
- Separate task queues only when workload isolation is operationally necessary
- Keep task payloads small and reference-based rather than embedding large business objects in queue messages

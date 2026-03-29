# Data Layer Architecture

## Purpose

Define how the system stores transactional application data and semantic retrieval data without mixing responsibilities. The backend remains the owner of all reads and writes.

## Storage Components

- Postgres for structured, relational, and transactional data
- Vector DB for embeddings, semantic indexing, and retrieval support

## Postgres Responsibilities

- Canonical records for users, onboarding state, plans, lab records, updates, and task status
- Transactional consistency for writes that must succeed together
- Queryable operational history and audit-friendly state transitions
- Source of truth for current active plan and prior versions

## Postgres Non-Responsibilities

- No semantic search ranking
- No prompt context assembly based on embeddings
- No storage of derived vector representations as a primary retrieval mechanism

## Vector DB Responsibilities

- Store embeddings for searchable text artifacts
- Support semantic retrieval for relevant prior plans, lab interpretations, and contextual knowledge fragments approved by the application
- Return ranked context candidates to the backend or AI layer for decision workflows

## Vector DB Non-Responsibilities

- No canonical ownership of user or plan records
- No transactional workflow state
- No direct frontend access

## Data Ownership Model

- Postgres owns business entities and workflow state
- Vector DB owns search-ready projections derived from approved source records
- If a source record changes, Postgres is updated first and vector indexing follows as a secondary projection step

## Write Pattern

1. Backend validates and persists the structured record in Postgres
2. Backend determines whether the record needs semantic indexing
3. If indexing is needed, backend triggers synchronous or asynchronous embedding update flow
4. Vector DB stores only the representation needed for retrieval plus a reference back to the canonical record

## Read Pattern

### Transactional Reads

- Backend reads directly from Postgres for dashboard state, workflow status, and canonical records

### Semantic Retrieval Reads

- Backend or AI layer requests relevant context candidates from Vector DB
- Retrieved references are resolved back to canonical records or approved text payloads before use in workflows

## Consistency Model

- Postgres is strongly authoritative
- Vector DB is eventually consistent with Postgres
- Background re-indexing is acceptable when semantic freshness is helpful but not transaction-critical

## Boundary Rules

- Frontend accesses data only through backend APIs
- AI layer never writes directly to Postgres or Vector DB
- Celery workers update stores through backend-owned application logic or shared adapters, not ad hoc scripts

## Minimal Scalability Guidance

- Start with a small set of indexable artifacts only
- Avoid indexing every field or every event by default
- Expand vector use only where semantic retrieval materially improves AI outputs or search quality

# System Overview

## Purpose

Provide a single high-level definition of the application architecture across the frontend, backend, AI layer, data layer, and async processing model.

## Core Layers

### Frontend

- Next.js dashboard using App Router
- Owns presentation, user input, and feature-level navigation

### Backend

- FastAPI modular monolith
- Owns API contracts, business workflows, persistence coordination, and job dispatch

### AI Layer

- Python-based Gateway and Orchestrator
- Owns AI request handling, prompt workflow routing, and structured outputs

### Data Layer

- Postgres for canonical structured records
- Vector DB for embeddings and semantic retrieval

### Async Processing

- FastAPI for task admission
- Redis as broker
- Celery workers for long-running execution

## Primary Interaction Boundaries

- Frontend communicates only with FastAPI
- FastAPI is the only layer allowed to coordinate across all other layers
- AI layer returns results but does not own product state
- Data stores are not called directly by the frontend
- Async processing is internal and status is surfaced through FastAPI

## Minimal Design Principles

- Keep one frontend, one backend, one AI layer, and one async worker system
- Separate responsibilities clearly before introducing abstractions
- Prefer module boundaries over service sprawl
- Keep all long-running work behind backend-managed async flows
- Treat Postgres as the canonical source of truth

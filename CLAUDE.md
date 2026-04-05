# WeightLoss Project — Claude / Codex Session Notes

## Critical: Git Worktree Setup

This project uses **git worktrees** for feature development. Worktrees only contain git-tracked files. The `backend/.env` file is gitignored and will **not** be present in a new worktree.

### Required step before running ANY alembic command in a worktree

```bash
cp D:/WeightLoss/backend/.env <worktree-path>/backend/.env
```

**Without this step, `alembic upgrade head`, `alembic revision --autogenerate`, and the backend server will all fail** with a Postgres authentication error because the default `POSTGRES_URL` in `config.py` uses the wrong password.

The real credentials live in `D:/WeightLoss/backend/.env`. Copy them into the worktree once at the start of every new worktree session.

---

## Project Structure

| Directory | Purpose |
|-----------|---------|
| `frontend/` | Next.js App Router (TypeScript) |
| `backend/` | FastAPI + SQLAlchemy + Alembic (Python) |
| `ai-services/` | FastAPI AI orchestrator with meal/lab/behavior agents |
| `shared/` | Shared types/utilities |
| `docs/superpowers/` | Implementation plans and design specs |
| `Documentation/` | Design documents |

## Backend

- FastAPI on port `8000`
- PostgreSQL — credentials in `backend/.env`
- Alembic migrations in `backend/alembic/versions/`
- Run migrations: `cd backend && alembic upgrade head`
- Start server: `cd backend && uvicorn app.main:app --reload --port 8000`

## AI Services

- FastAPI on port `8001`
- Start server: `cd ai-services && uvicorn app.main:app --reload --port 8001`

## Frontend

- Next.js on port `3000`
- Start server: `cd frontend && npm run dev`

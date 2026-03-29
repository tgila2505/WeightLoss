# WeightLoss Monorepo

## Structure

- `frontend/`: future Next.js application
- `backend/`: future Python backend services
- `ai-services/`: future Python AI gateway and orchestration services
- `shared/`: shared TypeScript utilities and types

## Environment strategy

- Keep a single root `.env.example` as the source template for all local variables.
- Each service reads environment variables from process environment only.
- Frontend should use `process.env` for `NEXT_PUBLIC_*` values and any server-only Next.js variables.
- Backend and AI services should use `os.environ` directly from the Python standard library.
- Local `.env` files are for developer convenience only and are never committed.

## Tooling

- Install JavaScript tooling once at the repo root with `pnpm install`.
- Install Python tooling in your active environment with `python -m pip install ruff`.
- Run `pnpm lint` for all configured lint checks.
- Run `pnpm format` to format JavaScript, TypeScript, and Python files.
- Run service-local scripts inside `frontend/` or `shared/`, and run `ruff check .` or `ruff format .` inside `backend/` or `ai-services/`.

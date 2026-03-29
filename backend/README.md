# Backend

- FastAPI backend application.
- Read environment variables through `os.environ`.
- Optionally provide a local `backend/.env`; values are loaded first from system environment and then from the local file only for missing keys.
- Install dependencies with `python -m pip install -r requirements.txt`.
- Configure PostgreSQL with `POSTGRES_URL`, for example `postgresql+psycopg://postgres:postgres@localhost:5432/weightloss`.
- Configure JWT with `BACKEND_JWT_SECRET`, `BACKEND_JWT_ALGORITHM`, and `BACKEND_ACCESS_TOKEN_EXPIRE_MINUTES`.
- Run locally with `uvicorn app.main:app --reload` from this directory.
- Create a migration with `alembic revision --autogenerate -m "message"` and apply it with `alembic upgrade head`.
- Run `ruff check .` and `ruff format .` from this directory.

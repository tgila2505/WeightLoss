# AI Services

- Python AI gateway and future orchestration services.
- Read environment variables through `os.environ`.
- Keep service-specific `.env` files local only and load them outside of application code if needed for development.
- Gateway foundation lives in `app/gateway/`.
- Orchestration foundation lives in `app/agents/`, `app/orchestrator/`, `app/prompts/`, and `app/providers/`.
- Run `ruff check .` and `ruff format .` from this directory.

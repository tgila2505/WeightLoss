from __future__ import annotations

from pathlib import Path
from typing import Any

from app.services.recommendation_service import RecommendationService

_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"

_AGENT_PROMPT_MAP = {
    "gp": "gp_system_prompt.txt",
    "endocrinologist": "endocrinologist_system_prompt.txt",
    "meal": "dietitian_system_prompt.txt",
    "trainer": "trainer_system_prompt.txt",
}


class PromptAuditService:
    def __init__(self, recommendation_service: RecommendationService) -> None:
        self._rec_svc = recommendation_service

    def sample_recent(self, agent_name: str, n: int = 5) -> list[dict[str, Any]]:
        """Return up to n recent recommendations for the given agent as plain dicts."""
        all_records = self._rec_svc.list_recommendations(user_id=None)
        matching = [
            {"content": r.content, "data": r.data, "intent": r.intent}
            for r in all_records
            if r.data.get("agent") == agent_name
        ]
        return matching[:n]

    def load_prompt(self, agent_name: str) -> str | None:
        """Load the current system prompt for an agent. Returns None if not found."""
        filename = _AGENT_PROMPT_MAP.get(agent_name)
        if filename is None:
            return None
        path = _PROMPTS_DIR / filename
        if not path.exists():
            return None
        return path.read_text(encoding="utf-8")

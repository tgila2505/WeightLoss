from __future__ import annotations

from app.providers.base import LLMProvider


class MockLLMProvider(LLMProvider):
    def generate(self, prompt: str, max_tokens: int | None = None) -> str:
        return f"Mock provider response: {prompt}"

from __future__ import annotations

from typing import Iterator

from app.providers.base import LLMProvider


class MockLLMProvider(LLMProvider):
    def generate(self, prompt: str, max_tokens: int | None = None) -> str:
        return f"Mock provider response: {prompt}"

    def stream_generate(self, prompt: str, max_tokens: int | None = None) -> Iterator[str]:
        """Yields words one at a time — simulates streaming without a real API call."""
        response = self.generate(prompt, max_tokens)
        words = response.split(" ")
        for i, word in enumerate(words):
            yield word + (" " if i < len(words) - 1 else "")

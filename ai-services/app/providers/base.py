from __future__ import annotations

from typing import Iterator, Protocol


class LLMProvider(Protocol):
    def generate(self, prompt: str, max_tokens: int | None = None) -> str:
        ...

    def stream_generate(self, prompt: str, max_tokens: int | None = None) -> Iterator[str]:
        ...

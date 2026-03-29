from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol


@dataclass(frozen=True)
class TokenUsage:
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int


@dataclass(frozen=True)
class AIRequest:
    prompt: str
    task_type: str = "default"
    preferred_model: str | None = None
    max_tokens: int = 512
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class AIResponse:
    content: str
    model: str
    provider: str
    token_usage: TokenUsage
    cached: bool = False


class GatewayInterface(Protocol):
    def generate(self, request: AIRequest) -> AIResponse:
        ...

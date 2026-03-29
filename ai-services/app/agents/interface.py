from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Protocol

from app.schemas.output import AIOutput


@dataclass(frozen=True)
class AgentInput:
    prompt: str
    task_type: str = "default"
    variables: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


class AgentInterface(Protocol):
    def run(self, request: AgentInput) -> AIOutput:
        ...

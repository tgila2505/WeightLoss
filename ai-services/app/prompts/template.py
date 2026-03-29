from __future__ import annotations

from dataclasses import dataclass
from string import Template
from typing import Any


@dataclass(frozen=True)
class PromptTemplate:
    template: str

    def render(self, variables: dict[str, Any] | None = None) -> str:
        values = {key: str(value) for key, value in (variables or {}).items()}
        return Template(self.template).safe_substitute(values)

from __future__ import annotations

import hashlib
import json

from app.gateway.interface import AIRequest, AIResponse


class PromptCache:
    def __init__(self) -> None:
        self._store: dict[str, AIResponse] = {}

    def build_key(self, request: AIRequest) -> str:
        payload = {
            "prompt": request.prompt,
            "task_type": request.task_type,
            "preferred_model": request.preferred_model,
            "max_tokens": request.max_tokens,
            "metadata": request.metadata,
        }
        serialized = json.dumps(payload, sort_keys=True, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def get(self, request: AIRequest) -> AIResponse | None:
        return self._store.get(self.build_key(request))

    def set(self, request: AIRequest, response: AIResponse) -> None:
        self._store[self.build_key(request)] = response

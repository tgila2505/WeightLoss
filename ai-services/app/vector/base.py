from __future__ import annotations

from typing import Any, Protocol


class VectorStore(Protocol):
    def upsert(self, namespace: str, item_id: str, text: str, metadata: dict[str, Any]) -> None:
        ...

    def search(
        self,
        namespace: str,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        ...

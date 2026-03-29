from __future__ import annotations

import json
from collections import defaultdict
from pathlib import Path
from typing import Any


class MockVectorDB:
    def __init__(self, storage_path: str | None = None) -> None:
        default_path = Path(__file__).resolve().parents[2] / "vector_store.json"
        self._storage_path = Path(storage_path) if storage_path is not None else default_path
        self._store: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
        self._load()

    def upsert(self, namespace: str, item_id: str, text: str, metadata: dict[str, Any]) -> None:
        self._store[namespace][item_id] = {"text": text, "metadata": metadata}
        self._persist()

    def search(
        self,
        namespace: str,
        query: str,
        limit: int = 5,
    ) -> list[dict[str, Any]]:
        query_terms = set(query.lower().split())
        candidates = []
        for item_id, payload in self._store.get(namespace, {}).items():
            text = str(payload["text"])
            score = len(query_terms.intersection(text.lower().split()))
            candidates.append(
                {
                    "id": item_id,
                    "score": score,
                    "text": text,
                    "metadata": payload["metadata"],
                }
            )
        candidates.sort(key=lambda item: item["score"], reverse=True)
        return candidates[:limit]

    def _load(self) -> None:
        if not self._storage_path.exists():
            return
        data = json.loads(self._storage_path.read_text(encoding="utf-8"))
        self._store = defaultdict(dict, data)

    def _persist(self) -> None:
        self._storage_path.parent.mkdir(parents=True, exist_ok=True)
        self._storage_path.write_text(
            json.dumps(self._store, indent=2, sort_keys=True),
            encoding="utf-8",
        )

from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class RecommendationRecord:
    id: int
    user_id: int
    intent: str
    content: str
    data: dict[str, Any]
    created_at: str


class RecommendationService:
    def __init__(self, db_path: str | None = None) -> None:
        default_path = Path(__file__).resolve().parents[2] / "recommendations.sqlite3"
        self._db_path = Path(db_path) if db_path is not None else default_path
        self._ensure_schema()

    def store_recommendation(
        self,
        user_id: int,
        intent: str,
        content: str,
        data: dict[str, Any],
    ) -> RecommendationRecord:
        created_at = datetime.now(UTC).isoformat()
        with sqlite3.connect(self._db_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO recommendations (user_id, intent, content, data, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (user_id, intent, content, json.dumps(data), created_at),
            )
            recommendation_id = int(cursor.lastrowid)
            connection.commit()
        return RecommendationRecord(
            id=recommendation_id,
            user_id=user_id,
            intent=intent,
            content=content,
            data=data,
            created_at=created_at,
        )

    def list_recommendations(self, user_id: int) -> list[RecommendationRecord]:
        with sqlite3.connect(self._db_path) as connection:
            rows = connection.execute(
                """
                SELECT id, user_id, intent, content, data, created_at
                FROM recommendations
                WHERE user_id = ?
                ORDER BY created_at DESC, id DESC
                """,
                (user_id,),
            ).fetchall()

        return [
            RecommendationRecord(
                id=row[0],
                user_id=row[1],
                intent=row[2],
                content=row[3],
                data=json.loads(row[4]),
                created_at=row[5],
            )
            for row in rows
        ]

    def _ensure_schema(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self._db_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS recommendations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER NOT NULL,
                    intent TEXT NOT NULL,
                    content TEXT NOT NULL,
                    data TEXT NOT NULL,
                    created_at TEXT NOT NULL
                )
                """
            )
            connection.commit()

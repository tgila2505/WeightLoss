from __future__ import annotations

import json
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Any


@dataclass(frozen=True)
class AdherenceRecord:
    id: int
    recommendation_id: int
    user_id: int
    signals: list[dict[str, Any]]


class AdherenceService:
    def __init__(self, db_path: str | None = None) -> None:
        default_path = Path(__file__).resolve().parents[2] / "recommendations.sqlite3"
        self._db_path = Path(db_path) if db_path is not None else default_path
        self._ensure_schema()

    def store_signals(
        self,
        recommendation_id: int,
        user_id: int,
        signals: list[dict[str, Any]],
    ) -> AdherenceRecord:
        with sqlite3.connect(self._db_path) as connection:
            cursor = connection.execute(
                """
                INSERT INTO adherence_signals (recommendation_id, user_id, signals)
                VALUES (?, ?, ?)
                """,
                (recommendation_id, user_id, json.dumps(signals)),
            )
            adherence_id = int(cursor.lastrowid)
            connection.commit()
        return AdherenceRecord(
            id=adherence_id,
            recommendation_id=recommendation_id,
            user_id=user_id,
            signals=signals,
        )

    def list_signals(self, user_id: int) -> list[AdherenceRecord]:
        with sqlite3.connect(self._db_path) as connection:
            rows = connection.execute(
                """
                SELECT id, recommendation_id, user_id, signals
                FROM adherence_signals
                WHERE user_id = ?
                ORDER BY id DESC
                """,
                (user_id,),
            ).fetchall()

        return [
            AdherenceRecord(
                id=row[0],
                recommendation_id=row[1],
                user_id=row[2],
                signals=json.loads(row[3]),
            )
            for row in rows
        ]

    def _ensure_schema(self) -> None:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        with sqlite3.connect(self._db_path) as connection:
            connection.execute(
                """
                CREATE TABLE IF NOT EXISTS adherence_signals (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    recommendation_id INTEGER NOT NULL,
                    user_id INTEGER NOT NULL,
                    signals TEXT NOT NULL
                )
                """
            )
            connection.commit()

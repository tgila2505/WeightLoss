from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

_STATE_FILE = Path(__file__).parents[2] / "rate_limits.json"
_LIMIT_HOURS = 24


class RateLimitService:
    def is_limited(self, provider: str) -> bool:
        entry = self._load().get(provider)
        if not entry or not entry.get("limited_at"):
            return False
        limited_at = datetime.fromisoformat(entry["limited_at"])
        return datetime.now(timezone.utc) - limited_at < timedelta(hours=_LIMIT_HOURS)

    def mark_limited(self, provider: str) -> None:
        state = self._load()
        now = datetime.now(timezone.utc)
        state[provider] = {
            "limited_at": now.isoformat(),
            "resets_at": (now + timedelta(hours=_LIMIT_HOURS)).isoformat(),
        }
        self._save(state)

    def get_reset_time(self, provider: str) -> str | None:
        entry = self._load().get(provider)
        return entry.get("resets_at") if entry else None

    def _load(self) -> dict:
        if _STATE_FILE.exists():
            try:
                return json.loads(_STATE_FILE.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                pass
        return {}

    def _save(self, state: dict) -> None:
        _STATE_FILE.write_text(json.dumps(state, indent=2), encoding="utf-8")

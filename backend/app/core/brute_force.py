import threading
import time
from dataclasses import dataclass, field


@dataclass
class _Record:
    failures: int = 0
    blocked_until: float = field(default=0.0)


class BruteForceGuard:
    def __init__(self, max_attempts: int = 5, block_seconds: int = 900) -> None:
        self.max_attempts = max_attempts
        self.block_seconds = block_seconds
        self._records: dict[str, _Record] = {}
        self._lock = threading.Lock()

    @staticmethod
    def _key(ip: str, identifier: str) -> str:
        return f"{ip}:{identifier.lower()}"

    def is_blocked(self, ip: str, identifier: str) -> bool:
        key = self._key(ip, identifier)
        now = time.monotonic()
        with self._lock:
            rec = self._records.get(key)
            if rec is None:
                return False
            if rec.blocked_until > now:
                return True
            if rec.blocked_until > 0:
                del self._records[key]
            return False

    def record_failure(self, ip: str, identifier: str) -> None:
        key = self._key(ip, identifier)
        with self._lock:
            rec = self._records.setdefault(key, _Record())
            rec.failures += 1
            if rec.failures >= self.max_attempts:
                rec.blocked_until = time.monotonic() + self.block_seconds

    def record_success(self, ip: str, identifier: str) -> None:
        key = self._key(ip, identifier)
        with self._lock:
            self._records.pop(key, None)


_guard = BruteForceGuard()


def get_brute_force_guard() -> BruteForceGuard:
    return _guard

import threading
import time
from collections import deque
from typing import Callable

from fastapi import HTTPException, Request, status


class _WindowCounter:
    __slots__ = ("limit", "window", "_times", "_lock")

    def __init__(self, limit: int, window: int) -> None:
        self.limit = limit
        self.window = window
        self._times: deque[float] = deque()
        self._lock = threading.Lock()

    def is_allowed(self) -> bool:
        now = time.monotonic()
        cutoff = now - self.window
        with self._lock:
            while self._times and self._times[0] < cutoff:
                self._times.popleft()
            if len(self._times) >= self.limit:
                return False
            self._times.append(now)
            return True


class _RateLimiter:
    def __init__(self) -> None:
        self._counters: dict[str, _WindowCounter] = {}
        self._lock = threading.Lock()

    def check(self, key: str, limit: int, window: int) -> bool:
        with self._lock:
            if key not in self._counters:
                self._counters[key] = _WindowCounter(limit, window)
            counter = self._counters[key]
        return counter.is_allowed()


_limiter = _RateLimiter()


def rate_limit(limit: int, window_seconds: int) -> Callable:
    """Dependency factory: enforce per-IP sliding-window rate limiting."""

    async def _dep(request: Request) -> None:
        ip = request.client.host if request.client else "unknown"
        key = f"rl:{request.url.path}:{ip}"
        if not _limiter.check(key, limit, window_seconds):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
                headers={"Retry-After": str(window_seconds)},
            )

    return _dep

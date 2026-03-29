from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass
from typing import TypeVar


T = TypeVar("T")


@dataclass(frozen=True)
class RetryPolicy:
    max_attempts: int = 2


class RetryExecutor:
    def __init__(self, policy: RetryPolicy | None = None) -> None:
        self._policy = policy or RetryPolicy()

    def run(
        self,
        operation: Callable[[], T],
        fallback_operation: Callable[[], T] | None = None,
    ) -> T:
        last_error: Exception | None = None

        for _ in range(self._policy.max_attempts):
            try:
                return operation()
            except Exception as exc:
                last_error = exc

        if fallback_operation is not None:
            return fallback_operation()

        if last_error is not None:
            raise last_error

        raise RuntimeError("RetryExecutor failed without capturing an exception")

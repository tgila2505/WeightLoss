"""In-memory metrics store with thread-safe rolling windows."""

from __future__ import annotations

import os
import threading
import time
from collections import deque
from dataclasses import dataclass


@dataclass
class SLAConfig:
    latency_p95_ms: float = float(os.environ.get("SLA_LATENCY_P95_MS", "500"))
    error_rate_pct: float = float(os.environ.get("SLA_ERROR_RATE_PCT", "5"))
    window_seconds: int = int(os.environ.get("SLA_WINDOW_SECONDS", "60"))


@dataclass
class LatencySample:
    ts: float
    duration_ms: float


@dataclass
class RequestSample:
    ts: float
    status_code: int
    path: str
    method: str
    duration_ms: float


def _percentile(sorted_values: list[float], pct: float) -> float:
    if not sorted_values:
        return 0.0
    idx = max(0, int(len(sorted_values) * pct / 100) - 1)
    return sorted_values[idx]


class MetricsStore:
    """Thread-safe rolling-window metrics store."""

    def __init__(self, window_seconds: int = 60) -> None:
        self._window = window_seconds
        self._lock = threading.Lock()
        self._samples: deque[RequestSample] = deque()
        self._total_requests: int = 0
        self._total_errors: int = 0

    def record(
        self,
        *,
        path: str,
        method: str,
        status_code: int,
        duration_ms: float,
    ) -> None:
        now = time.monotonic()
        sample = RequestSample(
            ts=now,
            status_code=status_code,
            path=path,
            method=method,
            duration_ms=duration_ms,
        )
        with self._lock:
            self._samples.append(sample)
            self._total_requests += 1
            if status_code >= 500:
                self._total_errors += 1
            self._evict(now)

    def _evict(self, now: float) -> None:
        cutoff = now - self._window
        while self._samples and self._samples[0].ts < cutoff:
            self._samples.popleft()

    def snapshot(self) -> dict:
        now = time.monotonic()
        with self._lock:
            self._evict(now)
            samples = list(self._samples)

        total = len(samples)
        errors = sum(1 for s in samples if s.status_code >= 500)
        error_rate = (errors / total * 100) if total else 0.0

        durations = sorted(s.duration_ms for s in samples)
        p50 = _percentile(durations, 50)
        p95 = _percentile(durations, 95)
        p99 = _percentile(durations, 99)

        return {
            "window_seconds": self._window,
            "request_count": total,
            "error_count": errors,
            "error_rate_pct": round(error_rate, 2),
            "latency_ms": {
                "p50": round(p50, 2),
                "p95": round(p95, 2),
                "p99": round(p99, 2),
            },
            "total_requests_lifetime": self._total_requests,
            "total_errors_lifetime": self._total_errors,
        }

    def check_sla(self, cfg: SLAConfig) -> list[str]:
        snap = self.snapshot()
        alerts: list[str] = []
        if snap["latency_ms"]["p95"] > cfg.latency_p95_ms:
            alerts.append(
                f"p95 latency {snap['latency_ms']['p95']:.0f}ms "
                f"exceeds SLA {cfg.latency_p95_ms:.0f}ms"
            )
        if snap["error_rate_pct"] > cfg.error_rate_pct:
            alerts.append(
                f"error rate {snap['error_rate_pct']:.1f}% "
                f"exceeds SLA {cfg.error_rate_pct:.1f}%"
            )
        return alerts


_store: MetricsStore | None = None
_store_lock = threading.Lock()


def get_metrics_store() -> MetricsStore:
    global _store
    if _store is None:
        with _store_lock:
            if _store is None:
                cfg = SLAConfig()
                _store = MetricsStore(window_seconds=cfg.window_seconds)
    return _store

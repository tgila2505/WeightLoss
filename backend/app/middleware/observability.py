"""Observability middleware: request-ID injection, latency tracking, SLA alerting."""

from __future__ import annotations

import secrets
import time

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.logging import get_logger, set_request_id
from app.core.metrics import SLAConfig, get_metrics_store

logger = get_logger(__name__)
_sla = SLAConfig()


class ObservabilityMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next) -> Response:
        request_id = secrets.token_hex(8)
        set_request_id(request_id)

        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000
            get_metrics_store().record(
                path=request.url.path,
                method=request.method,
                status_code=500,
                duration_ms=duration_ms,
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000

        get_metrics_store().record(
            path=request.url.path,
            method=request.method,
            status_code=response.status_code,
            duration_ms=duration_ms,
        )

        logger.info(
            "request",
            extra={
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
            },
        )

        alerts = get_metrics_store().check_sla(_sla)
        for alert in alerts:
            logger.warning("SLA breach: %s", alert)

        response.headers["X-Request-Id"] = request_id
        return response

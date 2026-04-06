"""GET /metrics — lightweight in-process metrics snapshot."""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.metrics import SLAConfig, get_metrics_store

router = APIRouter()
_sla = SLAConfig()


@router.get("/metrics", tags=["observability"])
def get_metrics() -> JSONResponse:
    store = get_metrics_store()
    snap = store.snapshot()
    snap["sla_alerts"] = store.check_sla(_sla)
    return JSONResponse(content=snap)

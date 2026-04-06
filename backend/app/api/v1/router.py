from fastapi import APIRouter

from app.api.v1.endpoints.adherence import router as adherence_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.health_metrics import router as health_metrics_router
from app.api.v1.endpoints.lab import router as lab_router
from app.api.v1.endpoints.metrics import router as metrics_router
from app.api.v1.endpoints.plans import router as plans_router
from app.api.v1.endpoints.profile import router as profile_router
from app.api.v1.endpoints.questionnaire import router as questionnaire_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.reminders import router as reminders_router

router = APIRouter()
router.include_router(adherence_router, tags=["adherence"])
router.include_router(analytics_router, tags=["analytics"])
router.include_router(auth_router, tags=["auth"])
router.include_router(health_router, tags=["health"])
router.include_router(health_metrics_router, tags=["health-metrics"])
router.include_router(lab_router, tags=["labs"])
router.include_router(metrics_router, tags=["observability"])
router.include_router(plans_router, tags=["plans"])
router.include_router(profile_router, tags=["profile"])
router.include_router(questionnaire_router, tags=["questionnaire"])
router.include_router(reminders_router, tags=["reminders"])

from fastapi import APIRouter

from app.api.v1.endpoints.adherence import router as adherence_router
from app.api.v1.endpoints.billing import router as billing_router
from app.api.v1.endpoints.funnel import router as funnel_router
from app.api.v1.endpoints.analytics import router as analytics_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.feedback import router as feedback_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.health_metrics import router as health_metrics_router
from app.api.v1.endpoints.lab import router as lab_router
from app.api.v1.endpoints.metrics import router as metrics_router
from app.api.v1.endpoints.onboarding import router as onboarding_router
from app.api.v1.endpoints.plans import router as plans_router
from app.api.v1.endpoints.profile import router as profile_router
from app.api.v1.endpoints.questionnaire import router as questionnaire_router
from app.api.v1.endpoints.experiments import router as experiments_router
from app.api.v1.endpoints.leaderboard import router as leaderboard_router
from app.api.v1.endpoints.referrals import router as referrals_router
from app.api.v1.endpoints.reminders import router as reminders_router
from app.api.v1.endpoints.gamification import router as gamification_router
from app.api.v1.endpoints.habits import router as habits_router
from app.api.v1.endpoints.notifications import router as notifications_router
from app.api.v1.endpoints.progress import router as progress_router
from app.api.v1.endpoints.reports import router as reports_router
from app.api.v1.endpoints.shared_plans import router as shared_plans_router

router = APIRouter()
router.include_router(adherence_router, tags=["adherence"])
router.include_router(billing_router, tags=["billing"])
router.include_router(funnel_router, tags=["funnel"])
router.include_router(analytics_router, tags=["analytics"])
router.include_router(auth_router, tags=["auth"])
router.include_router(feedback_router, tags=["feedback"])
router.include_router(gamification_router, tags=["gamification"])
router.include_router(habits_router, tags=["habits"])
router.include_router(health_router, tags=["health"])
router.include_router(health_metrics_router, tags=["health-metrics"])
router.include_router(lab_router, tags=["labs"])
router.include_router(leaderboard_router, tags=["leaderboard"])
router.include_router(metrics_router, tags=["observability"])
router.include_router(notifications_router, tags=["notifications"])
router.include_router(onboarding_router, tags=["onboarding"])
router.include_router(plans_router, tags=["plans"])
router.include_router(profile_router, tags=["profile"])
router.include_router(progress_router, tags=["progress"])
router.include_router(questionnaire_router, tags=["questionnaire"])
router.include_router(experiments_router, tags=["experiments"])
router.include_router(referrals_router, tags=["referrals"])
router.include_router(reminders_router, tags=["reminders"])
router.include_router(reports_router, tags=["reports"])
router.include_router(shared_plans_router, tags=["shared-plans"])

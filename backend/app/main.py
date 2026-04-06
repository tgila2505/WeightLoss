from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.middleware.observability import ObservabilityMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger
from app.services.reminder_dispatcher import dispatch_due_reminders

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(application: FastAPI) -> AsyncGenerator[None, None]:
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        dispatch_due_reminders,
        trigger="interval",
        minutes=1,
        id="reminder_dispatcher",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("Reminder scheduler started")
    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        logger.info("Reminder scheduler stopped")


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        lifespan=lifespan,
    )
    application.add_middleware(ObservabilityMiddleware)
    application.add_middleware(SecurityHeadersMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=["http://localhost:3000"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(application)
    application.include_router(api_router, prefix=settings.api_prefix)
    logger.info("Application configured for %s environment", settings.environment)
    return application


app = create_app()

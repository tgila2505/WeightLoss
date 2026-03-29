from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging, get_logger

logger = get_logger(__name__)


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging(settings)

    application = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
    )
    register_exception_handlers(application)
    application.include_router(api_router, prefix=settings.api_prefix)
    logger.info("Application configured for %s environment", settings.environment)
    return application


app = create_app()

from app.core.config import Settings
from app.core.logging import get_logger
from app.schemas.health import HealthResponse

logger = get_logger(__name__)


class HealthService:
    def __init__(self, settings: Settings) -> None:
        self._settings = settings

    def get_status(self) -> HealthResponse:
        logger.debug("Health status requested")
        return HealthResponse(
            status="ok",
            service=self._settings.app_name,
            environment=self._settings.environment,
            version=self._settings.app_version,
        )

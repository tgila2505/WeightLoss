import logging
import sys

from app.core.config import Settings


LOG_FORMAT = "%(asctime)s | %(levelname)s | %(name)s | %(message)s"


def configure_logging(settings: Settings) -> None:
    logging.basicConfig(
        level=settings.log_level,
        format=LOG_FORMAT,
        stream=sys.stdout,
        force=True,
    )
    # Keep uvicorn's access logger active so HTTP requests appear in the terminal
    uvicorn_access = logging.getLogger("uvicorn.access")
    if not uvicorn_access.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(logging.Formatter(LOG_FORMAT))
        uvicorn_access.addHandler(handler)
    uvicorn_access.setLevel(logging.INFO)
    uvicorn_access.propagate = True


def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)

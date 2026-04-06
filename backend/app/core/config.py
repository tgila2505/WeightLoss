import os
from dataclasses import dataclass
from pathlib import Path
from functools import lru_cache
from typing import Final


DEFAULT_API_PREFIX: Final[str] = "/api"
DEFAULT_ENV_FILE: Final[str] = ".env"
BASE_DIR = Path(__file__).resolve().parents[2]


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()

        if not line or line.startswith("#") or "=" not in line:
            continue

        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_version: str
    environment: str
    api_prefix: str
    log_level: str
    database_url: str
    jwt_secret_key: str
    jwt_algorithm: str
    access_token_expire_minutes: int
    refresh_token_expire_days: int

    @classmethod
    def from_env(cls) -> "Settings":
        env_file_name = os.environ.get("BACKEND_ENV_FILE", DEFAULT_ENV_FILE)
        load_env_file(BASE_DIR / env_file_name)

        return cls(
            app_name=os.environ.get("BACKEND_APP_NAME", "WeightLoss Backend"),
            app_version=os.environ.get("BACKEND_APP_VERSION", "0.1.0"),
            environment=os.environ.get("BACKEND_ENV", "development"),
            api_prefix=os.environ.get("BACKEND_API_PREFIX", DEFAULT_API_PREFIX),
            log_level=os.environ.get("BACKEND_LOG_LEVEL", "INFO").upper(),
            database_url=os.environ.get(
                "POSTGRES_URL",
                "postgresql+psycopg://postgres:postgres@localhost:5432/weightloss",
            ),
            jwt_secret_key=os.environ.get("BACKEND_JWT_SECRET", "change-me-in-production"),
            jwt_algorithm=os.environ.get("BACKEND_JWT_ALGORITHM", "HS256"),
            access_token_expire_minutes=int(
                os.environ.get("BACKEND_ACCESS_TOKEN_EXPIRE_MINUTES", "30")
            ),
            refresh_token_expire_days=int(
                os.environ.get("BACKEND_REFRESH_TOKEN_EXPIRE_DAYS", "7")
            ),
        )


@lru_cache
def get_settings() -> Settings:
    return Settings.from_env()

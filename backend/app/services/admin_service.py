from __future__ import annotations

import re
from pathlib import Path

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.app_config import AppConfig
from app.models.user import User
from app.schemas.admin import AiKeysInternalResponse, AiKeysPublicResponse, AiKeysUpdate

_AI_KEY_NAMES = ("groq_api_key", "mistral_api_key")


def _mask(value: str) -> str:
    """Return first 12 chars followed by *** — or empty string if unset."""
    if not value:
        return ""
    return value[:12] + "***"


def _set_env_key(path: Path, key: str, new_value: str) -> None:
    """Update or append a single KEY=value line in an env file (preserves other lines)."""
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(f"{key}={new_value}\n", encoding="utf-8")
        return

    text = path.read_text(encoding="utf-8")
    pattern = re.compile(rf"^{re.escape(key)}=.*$", re.MULTILINE)
    replacement = f"{key}={new_value}"

    if pattern.search(text):
        updated = pattern.sub(replacement, text)
    else:
        updated = text.rstrip("\n") + f"\n{replacement}\n"

    path.write_text(updated, encoding="utf-8")


class AdminService:
    def _get(self, session: Session, key: str) -> AppConfig | None:
        return session.scalar(select(AppConfig).where(AppConfig.key == key))

    def _upsert(self, session: Session, key: str, value: str, user_id: int) -> AppConfig:
        row = self._get(session, key)
        if row is None:
            row = AppConfig(key=key, value=value, updated_by_id=user_id)
            session.add(row)
        else:
            row.value = value
            row.updated_by_id = user_id
        return row

    # ------------------------------------------------------------------
    # Public API — used by admin endpoints
    # ------------------------------------------------------------------

    def get_ai_keys_public(self, session: Session) -> AiKeysPublicResponse:
        groq_row = self._get(session, "groq_api_key")
        mistral_row = self._get(session, "mistral_api_key")
        groq_val = groq_row.value if groq_row else ""
        mistral_val = mistral_row.value if mistral_row else ""
        updated_at = (groq_row or mistral_row)
        return AiKeysPublicResponse(
            groq_key_set=bool(groq_val),
            groq_key_preview=_mask(groq_val),
            mistral_key_set=bool(mistral_val),
            mistral_key_preview=_mask(mistral_val),
            updated_at=updated_at.updated_at if updated_at else None,
        )

    def update_ai_keys(
        self, session: Session, user: User, payload: AiKeysUpdate
    ) -> AiKeysPublicResponse:
        self._upsert(session, "groq_api_key", payload.groq_api_key.strip(), user.id)
        self._upsert(session, "mistral_api_key", payload.mistral_api_key.strip(), user.id)
        session.commit()

        settings = get_settings()
        groq_val = payload.groq_api_key.strip()
        mistral_val = payload.mistral_api_key.strip()

        # Sync to env files so services pick up the new keys on restart
        self._write_env_files(groq_val, mistral_val, settings)

        # Hot-reload ai-services (no restart needed)
        self._reload_ai_services(settings.ai_services_url)

        return AiKeysPublicResponse(
            groq_key_set=bool(groq_val),
            groq_key_preview=_mask(groq_val),
            mistral_key_set=bool(mistral_val),
            mistral_key_preview=_mask(mistral_val),
        )

    # ------------------------------------------------------------------
    # Internal API — used by Next.js server-side routes
    # ------------------------------------------------------------------

    def get_ai_keys_internal(self, session: Session) -> AiKeysInternalResponse:
        groq_row = self._get(session, "groq_api_key")
        mistral_row = self._get(session, "mistral_api_key")
        return AiKeysInternalResponse(
            groq_api_key=groq_row.value if groq_row else "",
            mistral_api_key=mistral_row.value if mistral_row else "",
        )

    # ------------------------------------------------------------------
    # Helper: promote a user to admin (called on login if email matches config)
    # ------------------------------------------------------------------

    @staticmethod
    def maybe_promote_admin(session: Session, user: User) -> None:
        settings = get_settings()
        if (
            settings.admin_email
            and user.email.lower() == settings.admin_email.lower()
            and not user.is_admin
        ):
            user.is_admin = True
            session.commit()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _write_env_files(self, groq_val: str, mistral_val: str, settings) -> None:
        for path_str, pairs in (
            (settings.ai_services_env_path, (("GROQ_API_KEY", groq_val), ("MISTRAL_API_KEY", mistral_val))),
            (settings.frontend_env_path, (("GROQ_API_KEY", groq_val), ("MISTRAL_API_KEY", mistral_val))),
        ):
            path = Path(path_str)
            try:
                for key, value in pairs:
                    _set_env_key(path, key, value)
            except OSError as exc:
                # Log but don't fail the request — DB is the source of truth
                import logging
                logging.getLogger(__name__).warning("Failed to write %s: %s", path, exc)

    def _reload_ai_services(self, ai_services_url: str) -> None:
        try:
            httpx.post(
                f"{ai_services_url}/internal/reload-config",
                timeout=5.0,
            )
        except Exception:  # noqa: BLE001
            import logging
            logging.getLogger(__name__).warning(
                "Could not reload ai-services at %s (service may be down)", ai_services_url
            )


admin_service = AdminService()

from __future__ import annotations

from typing import Iterator

from app.providers.groq_provider import GroqProvider
from app.providers.groq_provider import RateLimitError as GroqRateLimitError
from app.providers.mistral_provider import MistralProvider
from app.providers.mistral_provider import RateLimitError as MistralRateLimitError
from app.services.rate_limit_service import RateLimitService


class ProvidersExhaustedError(Exception):
    def __init__(self, resets_at: str | None = None) -> None:
        self.resets_at = resets_at
        super().__init__("Both AI providers have reached their daily rate limits.")


class FallbackProvider:
    def __init__(
        self,
        groq_key: str,
        mistral_key: str,
        rate_limit_service: RateLimitService | None = None,
    ) -> None:
        self._groq = GroqProvider(groq_key)
        self._mistral = MistralProvider(mistral_key)
        self._rls = rate_limit_service or RateLimitService()

    def generate(self, prompt: str, max_tokens: int = 1024) -> str:
        if not self._rls.is_limited("groq"):
            try:
                return self._groq.generate(prompt, max_tokens=max_tokens)
            except GroqRateLimitError:
                self._rls.mark_limited("groq")

        if not self._rls.is_limited("mistral"):
            try:
                return self._mistral.generate(prompt, max_tokens=max_tokens)
            except MistralRateLimitError:
                self._rls.mark_limited("mistral")

        resets_at = self._rls.get_reset_time("groq") or self._rls.get_reset_time("mistral")
        raise ProvidersExhaustedError(resets_at=resets_at)

    def stream_generate(self, prompt: str, max_tokens: int = 1024) -> Iterator[str]:
        if not self._rls.is_limited("groq"):
            try:
                yield from self._groq.stream_generate(prompt, max_tokens=max_tokens)
                return
            except GroqRateLimitError:
                self._rls.mark_limited("groq")

        if not self._rls.is_limited("mistral"):
            try:
                yield from self._mistral.stream_generate(prompt, max_tokens=max_tokens)
                return
            except MistralRateLimitError:
                self._rls.mark_limited("mistral")

        resets_at = self._rls.get_reset_time("groq") or self._rls.get_reset_time("mistral")
        raise ProvidersExhaustedError(resets_at=resets_at)

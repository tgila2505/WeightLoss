from __future__ import annotations

from dataclasses import replace

from app.gateway.cache import PromptCache
from app.gateway.interface import AIRequest, AIResponse, GatewayInterface
from app.gateway.retry import RetryExecutor
from app.gateway.router import ModelRouter
from app.gateway.token_control import TokenController


class AIGateway(GatewayInterface):
    def __init__(
        self,
        router: ModelRouter | None = None,
        token_controller: TokenController | None = None,
        retry_executor: RetryExecutor | None = None,
        cache: PromptCache | None = None,
    ) -> None:
        self._router = router or ModelRouter()
        self._token_controller = token_controller or TokenController()
        self._retry_executor = retry_executor or RetryExecutor()
        self._cache = cache or PromptCache()

    def generate(self, request: AIRequest) -> AIResponse:
        cached_response = self._cache.get(request)
        if cached_response is not None:
            return replace(cached_response, cached=True)

        primary_model = self._router.select_model(request)
        self._token_controller.validate(request, primary_model)

        def run_primary() -> AIResponse:
            content = self._router.invoke(primary_model, request)
            usage = self._token_controller.build_usage(request.prompt, content)
            return AIResponse(
                content=content,
                model=primary_model.name,
                provider=primary_model.provider,
                token_usage=usage,
                cached=False,
            )

        fallback_model = self._router.get_fallback(primary_model.name)

        def run_fallback() -> AIResponse:
            if fallback_model is None:
                return run_primary()

            self._token_controller.validate(request, fallback_model)
            content = self._router.invoke(fallback_model, request)
            usage = self._token_controller.build_usage(request.prompt, content)
            return AIResponse(
                content=content,
                model=fallback_model.name,
                provider=fallback_model.provider,
                token_usage=usage,
                cached=False,
            )

        response = self._retry_executor.run(run_primary, run_fallback)
        self._cache.set(request, response)
        return response


__all__ = [
    "AIGateway",
    "AIRequest",
    "AIResponse",
    "GatewayInterface",
]

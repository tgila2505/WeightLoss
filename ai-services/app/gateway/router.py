from __future__ import annotations

from dataclasses import dataclass

from app.gateway.interface import AIRequest


class GatewayProviderError(Exception):
    """Raised when a provider cannot return a response."""


@dataclass(frozen=True)
class ModelConfig:
    name: str
    provider: str
    max_input_tokens: int
    max_output_tokens: int
    fallback_model: str | None = None


class ModelRouter:
    def __init__(self) -> None:
        self._models = {
            "general-small": ModelConfig(
                name="general-small",
                provider="mock-primary",
                max_input_tokens=2048,
                max_output_tokens=512,
                fallback_model="general-safe",
            ),
            "analysis-medium": ModelConfig(
                name="analysis-medium",
                provider="mock-primary",
                max_input_tokens=4096,
                max_output_tokens=1024,
                fallback_model="general-safe",
            ),
            "general-safe": ModelConfig(
                name="general-safe",
                provider="mock-fallback",
                max_input_tokens=2048,
                max_output_tokens=512,
                fallback_model=None,
            ),
        }

    def select_model(self, request: AIRequest) -> ModelConfig:
        if request.preferred_model and request.preferred_model in self._models:
            return self._models[request.preferred_model]

        if request.task_type == "analysis":
            return self._models["analysis-medium"]

        return self._models["general-small"]

    def get_fallback(self, model_name: str) -> ModelConfig | None:
        config = self._models[model_name]
        if config.fallback_model is None:
            return None
        return self._models[config.fallback_model]

    def invoke(self, model: ModelConfig, request: AIRequest) -> str:
        if request.metadata.get("force_provider_error") == model.name:
            raise GatewayProviderError(f"Provider failed for model '{model.name}'")

        return (
            f"[{model.provider}:{model.name}] "
            f"Stub response for task '{request.task_type}': {request.prompt}"
        )

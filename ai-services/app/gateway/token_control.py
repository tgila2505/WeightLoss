from __future__ import annotations

from app.gateway.interface import AIRequest, TokenUsage
from app.gateway.router import ModelConfig


class TokenLimitError(ValueError):
    """Raised when a request exceeds configured token limits."""


def estimate_tokens(text: str) -> int:
    normalized = text.strip()
    if not normalized:
        return 0
    return len(normalized.split())


class TokenController:
    def validate(self, request: AIRequest, model: ModelConfig) -> int:
        prompt_tokens = estimate_tokens(request.prompt)

        if prompt_tokens > model.max_input_tokens:
            raise TokenLimitError(
                f"Prompt exceeds model input limit: {prompt_tokens} > {model.max_input_tokens}"
            )

        if request.max_tokens > model.max_output_tokens:
            raise TokenLimitError(
                f"Requested output exceeds model limit: {request.max_tokens} > {model.max_output_tokens}"
            )

        return prompt_tokens

    def build_usage(self, prompt: str, content: str) -> TokenUsage:
        prompt_tokens = estimate_tokens(prompt)
        completion_tokens = estimate_tokens(content)
        return TokenUsage(
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
        )

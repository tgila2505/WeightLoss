from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Iterator

_MISTRAL_URL = "https://api.mistral.ai/v1/chat/completions"
_MODEL = "mistral-small-latest"


class RateLimitError(Exception):
    pass


class MistralProvider:
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def generate(self, prompt: str, max_tokens: int = 1024) -> str:
        payload = json.dumps({
            "model": _MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.7,
        }).encode()

        req = urllib.request.Request(
            _MISTRAL_URL,
            data=payload,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "User-Agent": "python-httpx/0.25.0",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read())
                return data["choices"][0]["message"]["content"]
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise RateLimitError("Mistral rate limit reached") from e
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Mistral API error {e.code}: {body}") from e

    def stream_generate(self, prompt: str, max_tokens: int = 1024) -> Iterator[str]:
        payload = json.dumps({
            "model": _MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "stream": True,
        }).encode()

        req = urllib.request.Request(
            _MISTRAL_URL,
            data=payload,
            headers={
                "Authorization": f"Bearer {self._api_key}",
                "Content-Type": "application/json",
                "User-Agent": "python-httpx/0.25.0",
            },
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                for raw_line in resp:
                    line = raw_line.decode("utf-8").strip()
                    if not line.startswith("data: "):
                        continue
                    data_str = line[6:]
                    if data_str == "[DONE]":
                        return
                    try:
                        data = json.loads(data_str)
                        token = data["choices"][0]["delta"].get("content") or ""
                        if token:
                            yield token
                    except (json.JSONDecodeError, KeyError, IndexError):
                        continue
        except urllib.error.HTTPError as e:
            if e.code == 429:
                raise RateLimitError("Mistral rate limit reached") from e
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Mistral API error {e.code}: {body}") from e

from __future__ import annotations

import json
import urllib.error
import urllib.request

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_MODEL = "llama-3.1-8b-instant"


class RateLimitError(Exception):
    pass


class GroqProvider:
    def __init__(self, api_key: str) -> None:
        self._api_key = api_key

    def generate(self, prompt: str) -> str:
        payload = json.dumps({
            "model": _MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": 1024,
            "temperature": 0.7,
        }).encode()

        req = urllib.request.Request(
            _GROQ_URL,
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
                raise RateLimitError("Groq rate limit reached") from e
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Groq API error {e.code}: {body}") from e

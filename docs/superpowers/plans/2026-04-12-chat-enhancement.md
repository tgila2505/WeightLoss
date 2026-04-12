# Chat Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Evolve the existing `/interaction` page into a multi-agent streamed chat interface with 5 specialist personas, GP consensus on every response, backend-persisted history, and a paid-plan gate.

**Architecture:** New `POST /chat` SSE endpoint in ai-services runs the selected specialist(s) then streams GPAgent's validated response token-by-token. The backend proxies the SSE stream via `httpx`, saves both turns to a new `chat_messages` DB table, and gates access behind `require_capability("ai_plans")`. The frontend evolves `interaction.tsx` into a sidebar + bubble chat UI using a set of focused components.

**Tech Stack:** FastAPI SSE (`StreamingResponse`), httpx streaming proxy, SQLAlchemy UUID model, Alembic migration, Next.js App Router, React ReadableStream, Tailwind CSS / shadcn/ui.

---

## File Map

### AI Services
| Action | File | Responsibility |
|---|---|---|
| Modify | `ai-services/app/providers/base.py` | Add `stream_generate` to `LLMProvider` protocol |
| Modify | `ai-services/app/providers/mock_provider.py` | Implement `stream_generate` (yields words one at a time) |
| Modify | `ai-services/app/providers/groq_provider.py` | Implement `stream_generate` via Groq SSE API |
| Modify | `ai-services/app/providers/mistral_provider.py` | Implement `stream_generate` via Mistral SSE API |
| Modify | `ai-services/app/providers/fallback_provider.py` | Implement `stream_generate` with fallback logic |
| Modify | `ai-services/app/agents/gp_agent.py` | Add public `build_chat_prompt` method |
| Create | `ai-services/app/chat/__init__.py` | Empty package marker |
| Create | `ai-services/app/chat/router.py` | `ChatRouter` — maps `agent` value to specialist pipeline |
| Modify | `ai-services/app/main.py` | Add `ChatRequest` model + `POST /chat` endpoint |
| Create | `ai-services/tests/test_chat.py` | 3 tests: routing, GP consulted, SSE response |

### Backend
| Action | File | Responsibility |
|---|---|---|
| Create | `backend/app/models/chat.py` | `ChatMessage` SQLAlchemy model |
| Create | `backend/alembic/versions/e6f7a8b9c0d1_add_chat_messages.py` | Migration adding `chat_messages` table |
| Create | `backend/app/schemas/chat.py` | Request/response Pydantic schemas |
| Create | `backend/app/api/v1/endpoints/chat.py` | 3 endpoints: message, history, new conversation |
| Modify | `backend/app/api/v1/router.py` | Register chat router |
| Modify | `backend/tests/support.py` | Import `ChatMessage` model so SQLite creates the table |
| Create | `backend/tests/test_chat_api.py` | 3 tests: save turns, history, new conversation |

### Frontend
| Action | File | Responsibility |
|---|---|---|
| Modify | `frontend/lib/api-client.ts` | Add `streamChatMessage`, `getChatHistory`, `startNewConversation` |
| Create | `frontend/app/components/chat/chat-bubble.tsx` | Single message bubble (user or assistant) with avatar |
| Create | `frontend/app/components/chat/consultation-indicator.tsx` | Amber pulsing "consultation underway" bubble |
| Create | `frontend/app/components/chat/streaming-bubble.tsx` | Assembles SSE tokens into growing text in real time |
| Create | `frontend/app/components/chat/agent-sidebar.tsx` | Sidebar persona list + "New conversation" button |
| Create | `frontend/app/components/chat/upgrade-prompt.tsx` | Paid-gate message shown to free users |
| Create | `frontend/app/components/chat/chat-thread.tsx` | Scrollable message list container |
| Modify | `frontend/app/components/interaction.tsx` | Full rewrite using new components |

---

## Task 1 — AI Services: stream_generate on LLMProvider protocol + MockProvider

**Files:**
- Modify: `ai-services/app/providers/base.py`
- Modify: `ai-services/app/providers/mock_provider.py`

- [ ] **Step 1: Write the failing test**

Create `ai-services/tests/test_stream_generate.py`:

```python
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.providers.mock_provider import MockLLMProvider


class TestMockStreamGenerate(unittest.TestCase):
    def test_stream_generate_yields_tokens(self):
        provider = MockLLMProvider()
        tokens = list(provider.stream_generate("hello"))
        self.assertTrue(len(tokens) > 0)

    def test_stream_generate_reassembles_to_full_response(self):
        provider = MockLLMProvider()
        full = "".join(provider.stream_generate("hello"))
        self.assertIn("Mock provider response", full)
```

- [ ] **Step 2: Run to verify it fails**

```bash
cd ai-services && python -m pytest tests/test_stream_generate.py -v
```
Expected: `AttributeError: 'MockLLMProvider' object has no attribute 'stream_generate'`

- [ ] **Step 3: Add stream_generate to LLMProvider protocol**

Replace the entire contents of `ai-services/app/providers/base.py`:

```python
from __future__ import annotations

from typing import Iterator, Protocol


class LLMProvider(Protocol):
    def generate(self, prompt: str, max_tokens: int | None = None) -> str:
        ...

    def stream_generate(self, prompt: str, max_tokens: int | None = None) -> Iterator[str]:
        ...
```

- [ ] **Step 4: Implement stream_generate on MockLLMProvider**

Replace the entire contents of `ai-services/app/providers/mock_provider.py`:

```python
from __future__ import annotations

from typing import Iterator

from app.providers.base import LLMProvider


class MockLLMProvider(LLMProvider):
    def generate(self, prompt: str, max_tokens: int | None = None) -> str:
        return f"Mock provider response: {prompt}"

    def stream_generate(self, prompt: str, max_tokens: int | None = None) -> Iterator[str]:
        """Yields words one at a time — simulates streaming without a real API call."""
        response = self.generate(prompt, max_tokens)
        for word in response.split(" "):
            yield word + " "
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd ai-services && python -m pytest tests/test_stream_generate.py -v
```
Expected: 2 PASSED

- [ ] **Step 6: Commit**

```bash
cd ai-services && git add app/providers/base.py app/providers/mock_provider.py tests/test_stream_generate.py
git commit -m "feat(ai-services): add stream_generate to LLMProvider protocol + MockProvider"
```

---

## Task 2 — AI Services: stream_generate on Groq, Mistral, FallbackProvider

**Files:**
- Modify: `ai-services/app/providers/groq_provider.py`
- Modify: `ai-services/app/providers/mistral_provider.py`
- Modify: `ai-services/app/providers/fallback_provider.py`

- [ ] **Step 1: Add stream_generate to GroqProvider**

Replace the entire contents of `ai-services/app/providers/groq_provider.py`:

```python
from __future__ import annotations

import json
import urllib.error
import urllib.request
from typing import Iterator

_GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"
_MODEL = "llama-3.1-8b-instant"


class RateLimitError(Exception):
    pass


class GroqProvider:
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

    def stream_generate(self, prompt: str, max_tokens: int = 1024) -> Iterator[str]:
        payload = json.dumps({
            "model": _MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": 0.7,
            "stream": True,
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
                raise RateLimitError("Groq rate limit reached") from e
            body = e.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Groq API error {e.code}: {body}") from e
```

- [ ] **Step 2: Add stream_generate to MistralProvider**

Replace the entire contents of `ai-services/app/providers/mistral_provider.py`:

```python
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
```

- [ ] **Step 3: Add stream_generate to FallbackProvider**

Replace the entire contents of `ai-services/app/providers/fallback_provider.py`:

```python
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
```

- [ ] **Step 4: Run the existing provider tests to confirm nothing is broken**

```bash
cd ai-services && python -m pytest tests/ -v -k "provider or fallback or groq or mistral" 2>/dev/null || python -m pytest tests/ -v
```
Expected: all existing tests PASS

- [ ] **Step 5: Commit**

```bash
cd ai-services && git add app/providers/groq_provider.py app/providers/mistral_provider.py app/providers/fallback_provider.py
git commit -m "feat(ai-services): add stream_generate to Groq, Mistral, and FallbackProvider"
```

---

## Task 3 — AI Services: ChatRouter + GPAgent.build_chat_prompt + tests

**Files:**
- Create: `ai-services/app/chat/__init__.py`
- Create: `ai-services/app/chat/router.py`
- Modify: `ai-services/app/agents/gp_agent.py`
- Create: `ai-services/tests/test_chat.py`

- [ ] **Step 1: Write the failing tests**

Create `ai-services/tests/test_chat.py`:

```python
from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.chat.router import ChatRouter
from app.agents.gp_agent import GPAgent


class TestChatRouter(unittest.TestCase):
    def setUp(self):
        self.router = ChatRouter()

    def test_dietitian_pipeline_is_meal_only(self):
        pipeline = self.router.get_specialist_pipeline("dietitian")
        self.assertEqual(pipeline, [("meal", "dietitian")])

    def test_endo_pipeline_is_lab_only(self):
        pipeline = self.router.get_specialist_pipeline("endo")
        self.assertEqual(pipeline, [("lab", "endocrinologist")])

    def test_trainer_pipeline_is_trainer_only(self):
        pipeline = self.router.get_specialist_pipeline("trainer")
        self.assertEqual(pipeline, [("trainer", "trainer")])

    def test_panel_runs_full_cascade(self):
        pipeline = self.router.get_specialist_pipeline("panel")
        self.assertEqual(pipeline, [
            ("lab", "endocrinologist"),
            ("meal", "dietitian"),
            ("trainer", "trainer"),
        ])

    def test_gp_runs_full_cascade(self):
        pipeline = self.router.get_specialist_pipeline("gp")
        self.assertEqual(pipeline, [
            ("lab", "endocrinologist"),
            ("meal", "dietitian"),
            ("trainer", "trainer"),
        ])


class TestGPAgentBuildChatPrompt(unittest.TestCase):
    def test_build_chat_prompt_includes_user_question(self):
        agent = GPAgent()
        prompt = agent.build_chat_prompt("What should I eat?", {})
        self.assertIn("What should I eat?", prompt)

    def test_build_chat_prompt_includes_specialist_outputs(self):
        agent = GPAgent()
        specialist_outputs = {
            "dietitian": {"data": {"meals": ["salad", "soup"]}, "content": "eat less sugar"}
        }
        prompt = agent.build_chat_prompt("What should I eat?", specialist_outputs)
        self.assertIn("dietitian", prompt.lower())
```

- [ ] **Step 2: Run to verify they fail**

```bash
cd ai-services && python -m pytest tests/test_chat.py -v
```
Expected: `ModuleNotFoundError: No module named 'app.chat'` and `AttributeError: 'GPAgent' has no attribute 'build_chat_prompt'`

- [ ] **Step 3: Create the chat package**

Create `ai-services/app/chat/__init__.py` (empty):

```python
```

- [ ] **Step 4: Create ChatRouter**

Create `ai-services/app/chat/router.py`:

```python
from __future__ import annotations

# Maps agent selector value → list of (agent_key, specialist_output_key) pairs.
# These are the specialist agents that run BEFORE GP consensus.
# "gp" and "panel" both run the full cascade; GP then synthesises all outputs.
_SPECIALIST_PIPELINE: dict[str, list[tuple[str, str]]] = {
    "dietitian": [("meal", "dietitian")],
    "endo":      [("lab", "endocrinologist")],
    "trainer":   [("trainer", "trainer")],
    "gp":        [("lab", "endocrinologist"), ("meal", "dietitian"), ("trainer", "trainer")],
    "panel":     [("lab", "endocrinologist"), ("meal", "dietitian"), ("trainer", "trainer")],
}


class ChatRouter:
    """Determines which specialist agents to invoke before GP consensus for a chat turn."""

    def get_specialist_pipeline(self, agent: str) -> list[tuple[str, str]]:
        """Return ordered list of (agent_key, specialist_output_key) pairs for the agent."""
        return _SPECIALIST_PIPELINE.get(agent, [])
```

- [ ] **Step 5: Add build_chat_prompt to GPAgent**

In `ai-services/app/agents/gp_agent.py`, add the following public method directly after `__init__` (before `_get_system_prompt`):

```python
    def build_chat_prompt(self, user_prompt: str, specialist_outputs: dict) -> str:
        """Public method for chat endpoint — builds the GP prompt from specialist outputs."""
        return self._build_prompt(user_prompt, specialist_outputs)
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd ai-services && python -m pytest tests/test_chat.py -v
```
Expected: 7 PASSED

- [ ] **Step 7: Run full test suite to confirm no regressions**

```bash
cd ai-services && python -m pytest tests/ -v
```
Expected: all tests PASS

- [ ] **Step 8: Commit**

```bash
cd ai-services && git add app/chat/__init__.py app/chat/router.py app/agents/gp_agent.py tests/test_chat.py
git commit -m "feat(ai-services): add ChatRouter and GPAgent.build_chat_prompt for chat endpoint"
```

---

## Task 4 — AI Services: POST /chat endpoint

**Files:**
- Modify: `ai-services/app/main.py`

- [ ] **Step 1: Write the failing endpoint test**

Add to `ai-services/tests/test_chat.py` (append after the existing classes):

```python
import json
from fastapi.testclient import TestClient


class TestChatEndpoint(unittest.TestCase):
    def setUp(self):
        from app.main import app
        self.client = TestClient(app)

    def _base_payload(self, agent: str = "dietitian") -> dict:
        return {
            "agent": agent,
            "message": "What should I eat today?",
            "conversation_history": [],
            "user_context": {},
        }

    def test_chat_returns_event_stream_content_type(self):
        with self.client.stream("POST", "/chat", json=self._base_payload()) as response:
            self.assertEqual(response.status_code, 200)
            self.assertIn("text/event-stream", response.headers["content-type"])

    def test_chat_response_ends_with_done(self):
        with self.client.stream("POST", "/chat", json=self._base_payload()) as response:
            content = response.read().decode()
        self.assertIn("[DONE]", content)

    def test_chat_emits_token_data_lines(self):
        with self.client.stream("POST", "/chat", json=self._base_payload()) as response:
            content = response.read().decode()
        token_lines = [
            line for line in content.splitlines()
            if line.startswith("data: ") and "[DONE]" not in line
        ]
        self.assertTrue(len(token_lines) > 0)
        # Each token line must be valid JSON with a "token" key
        for line in token_lines:
            parsed = json.loads(line[6:])
            self.assertIn("token", parsed)

    def test_chat_panel_agent_accepted(self):
        with self.client.stream("POST", "/chat", json=self._base_payload("panel")) as response:
            self.assertEqual(response.status_code, 200)
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd ai-services && python -m pytest tests/test_chat.py::TestChatEndpoint -v
```
Expected: 404 (no `/chat` route yet)

- [ ] **Step 3: Add ChatRequest model and /chat endpoint to main.py**

In `ai-services/app/main.py`, add after the existing imports block (after the `from app.providers.fallback_provider import ...` line):

```python
from typing import Iterator, Literal
from fastapi.responses import StreamingResponse
from app.agents.interface import AgentInput
from app.chat.router import ChatRouter
```

Then add these Pydantic models **before** the `app = FastAPI(...)` line:

```python
class ChatMessageItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatUserContext(BaseModel):
    user_profile: UserProfilePayload | None = None
    health_metrics: list[HealthMetricPayload] = Field(default_factory=list)
    lab_records: list[LabRecordPayload] = Field(default_factory=list)
    master_profile: str | None = None


class ChatRequest(BaseModel):
    agent: Literal["gp", "endo", "dietitian", "trainer", "panel"]
    message: str
    conversation_history: list[ChatMessageItem] = Field(default_factory=list)
    user_context: ChatUserContext = Field(default_factory=ChatUserContext)
```

Then add the following helper function and endpoint **after** the `reload_config` endpoint at the bottom of `main.py`:

```python
def _get_streaming_provider() -> FallbackProvider | None:
    """Return a FallbackProvider when both API keys are configured, else None."""
    if _GROQ_API_KEY and _MISTRAL_API_KEY:
        return FallbackProvider(groq_key=_GROQ_API_KEY, mistral_key=_MISTRAL_API_KEY)
    return None


@app.post("/chat")
def chat(payload: ChatRequest) -> StreamingResponse:
    """
    Streamed multi-agent chat endpoint.

    Phase 1 (silent): Runs specialist agent(s) based on the selected persona.
    Phase 2 (streamed): GP validates the specialist output and streams its response.
    The frontend shows a 'consultation underway' indicator until the first token arrives.
    """
    import json as _json

    # Build conversation history block for prompt injection
    history_text = ""
    if payload.conversation_history:
        lines = []
        for msg in payload.conversation_history[-20:]:
            prefix = "Patient" if msg.role == "user" else "Consultant"
            lines.append(f"{prefix}: {msg.content}")
        history_text = "\n".join(lines)

    prompt_with_history = payload.message
    if history_text:
        prompt_with_history = (
            f"PRIOR CONVERSATION:\n{history_text}\n\nCURRENT QUESTION: {payload.message}"
        )

    def generate() -> Iterator[str]:
        orch = _get_orchestrator()
        router = ChatRouter()

        # --- Phase 1: run specialist agents synchronously ---
        specialist_outputs: dict[str, dict] = {}
        for agent_key, output_key in router.get_specialist_pipeline(payload.agent):
            agent_obj = orch._agents.get(agent_key)
            if agent_obj is None:
                continue
            agent_input = AgentInput(
                prompt=prompt_with_history,
                task_type=agent_key,
                variables={
                    "intent": "question",
                    "user_profile": (
                        payload.user_context.user_profile.model_dump()
                        if payload.user_context.user_profile else None
                    ),
                    "master_profile": payload.user_context.master_profile or "",
                    "health_metrics": [
                        m.model_dump() for m in payload.user_context.health_metrics
                    ],
                    "lab_records": [
                        r.model_dump() for r in payload.user_context.lab_records
                    ],
                    "adherence_signals": [],
                    "consistency_level": None,
                    "adaptive_adjustment": None,
                    "past_recommendations": [],
                    "specialist_outputs": specialist_outputs,
                },
                metadata={"agent_name": agent_key},
            )
            output = agent_obj.run(agent_input)
            specialist_outputs[output_key] = {
                "content": output.content,
                "data": dict(output.data),
                "metadata": dict(output.metadata),
                "status": output.status,
            }

        # --- Phase 2: stream GP response ---
        gp_agent = orch._agents.get("gp")
        if gp_agent is None:
            yield "data: [DONE]\n\n"
            return

        provider = _get_streaming_provider()
        if provider is not None:
            try:
                gp_prompt = gp_agent.build_chat_prompt(prompt_with_history, specialist_outputs)
                for token in provider.stream_generate(gp_prompt):
                    yield f"data: {_json.dumps({'token': token})}\n\n"
            except Exception:
                # Fall back to rule-based on any provider error
                result = gp_agent._run_rule_based(prompt_with_history, specialist_outputs)
                yield f"data: {_json.dumps({'token': result.content})}\n\n"
        else:
            # No provider keys: rule-based response emitted as a single token
            result = gp_agent._run_rule_based(prompt_with_history, specialist_outputs)
            yield f"data: {_json.dumps({'token': result.content})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

- [ ] **Step 4: Run endpoint tests**

```bash
cd ai-services && python -m pytest tests/test_chat.py::TestChatEndpoint -v
```
Expected: 4 PASSED

- [ ] **Step 5: Run full test suite**

```bash
cd ai-services && python -m pytest tests/ -v
```
Expected: all tests PASS

- [ ] **Step 6: Commit**

```bash
cd ai-services && git add app/main.py tests/test_chat.py
git commit -m "feat(ai-services): add POST /chat streaming endpoint with GP consensus"
```

---

## Task 5 — Backend: ChatMessage model + Alembic migration

**Files:**
- Create: `backend/app/models/chat.py`
- Create: `backend/alembic/versions/e6f7a8b9c0d1_add_chat_messages.py`

- [ ] **Step 1: Create the ChatMessage model**

Create `backend/app/models/chat.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, index=True
    )
    agent: Mapped[str] = mapped_column(String(20), nullable=False)
    # agent values: dietitian | endo | trainer | gp | panel
    role: Mapped[str] = mapped_column(String(10), nullable=False)
    # role values: user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
```

- [ ] **Step 2: Create the Alembic migration**

Create `backend/alembic/versions/e6f7a8b9c0d1_add_chat_messages.py`:

```python
"""add chat_messages table

Revision ID: e6f7a8b9c0d1
Revises: d2e3f4a5b6c7
Create Date: 2026-04-12 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from alembic import op

revision: str = "e6f7a8b9c0d1"
down_revision: str = "d2e3f4a5b6c7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "chat_messages",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            primary_key=True,
            server_default=sa.text("gen_random_uuid()"),
        ),
        sa.Column(
            "user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("conversation_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("agent", sa.String(20), nullable=False),
        sa.Column("role", sa.String(10), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_chat_messages_user_id", "chat_messages", ["user_id"])
    op.create_index("ix_chat_messages_conversation_id", "chat_messages", ["conversation_id"])


def downgrade() -> None:
    op.drop_index("ix_chat_messages_conversation_id", "chat_messages")
    op.drop_index("ix_chat_messages_user_id", "chat_messages")
    op.drop_table("chat_messages")
```

- [ ] **Step 3: Run the migration against the real DB**

```bash
cp D:/WeightLoss/backend/.env backend/.env   # if not already present
cd backend && alembic upgrade head
```
Expected: migration runs without error, `chat_messages` table created.

- [ ] **Step 4: Commit**

```bash
cd backend && git add app/models/chat.py alembic/versions/e6f7a8b9c0d1_add_chat_messages.py
git commit -m "feat(backend): add ChatMessage model and chat_messages migration"
```

---

## Task 6 — Backend: chat schemas, endpoints, router registration, and tests

**Files:**
- Create: `backend/app/schemas/chat.py`
- Create: `backend/app/api/v1/endpoints/chat.py`
- Modify: `backend/app/api/v1/router.py`
- Modify: `backend/tests/support.py`
- Create: `backend/tests/test_chat_api.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_chat_api.py`:

```python
from __future__ import annotations

import sys
import unittest
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import app.models.chat  # noqa: F401 — registers ChatMessage with Base.metadata
from tests.support import ApiTestCase


class TestChatHistory(ApiTestCase):
    def test_get_history_returns_empty_for_new_agent(self):
        user = self.create_user()
        self.give_user_pro_subscription(user)
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/chat/dietitian/history", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("conversation_id", data)
        self.assertIn("messages", data)
        self.assertEqual(data["messages"], [])

    def test_get_history_requires_auth(self):
        resp = self.client.get("/api/v1/chat/dietitian/history")
        self.assertEqual(resp.status_code, 401)

    def test_get_history_requires_paid_plan(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/chat/dietitian/history", headers=headers)
        self.assertEqual(resp.status_code, 403)


class TestNewConversation(ApiTestCase):
    def test_new_conversation_returns_uuid(self):
        user = self.create_user()
        self.give_user_pro_subscription(user)
        headers = self.auth_headers_for_user(user)
        resp = self.client.post("/api/v1/chat/dietitian/new", headers=headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn("conversation_id", data)
        # Must be a valid UUID string
        import uuid
        uuid.UUID(data["conversation_id"])  # raises ValueError if invalid

    def test_new_conversation_different_each_time(self):
        user = self.create_user()
        self.give_user_pro_subscription(user)
        headers = self.auth_headers_for_user(user)
        r1 = self.client.post("/api/v1/chat/dietitian/new", headers=headers).json()
        r2 = self.client.post("/api/v1/chat/dietitian/new", headers=headers).json()
        self.assertNotEqual(r1["conversation_id"], r2["conversation_id"])

    def test_new_conversation_requires_paid_plan(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.post("/api/v1/chat/dietitian/new", headers=headers)
        self.assertEqual(resp.status_code, 403)
```

- [ ] **Step 2: Run to verify tests fail**

```bash
cd backend && python -m pytest tests/test_chat_api.py -v 2>&1 | head -30
```
Expected: `404` responses (routes don't exist yet)

- [ ] **Step 3: Create chat schemas**

Create `backend/app/schemas/chat.py`:

```python
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Literal

from pydantic import BaseModel


class ChatMessageSchema(BaseModel):
    role: Literal["user", "assistant"]
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryResponse(BaseModel):
    conversation_id: str
    agent: str
    messages: list[ChatMessageSchema]


class NewConversationResponse(BaseModel):
    conversation_id: str


class SendMessageRequest(BaseModel):
    agent: Literal["gp", "endo", "dietitian", "trainer", "panel"]
    message: str
    conversation_id: str
```

- [ ] **Step 4: Create chat endpoints**

> **Note for implementer:** Before writing this file, verify the exact field names on `Profile`, `HealthMetrics`, and `LabRecord` models by reading `backend/app/models/profile.py`, `backend/app/models/health_metrics.py`, and `backend/app/models/lab.py`. The field names used below match what the orchestrator payload expects but should be confirmed against the actual models.

Create `backend/app/api/v1/endpoints/chat.py`:

```python
from __future__ import annotations

import json
import os
import uuid
from typing import AsyncIterator

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.session import SessionLocal, get_db_session
from app.dependencies.auth import get_current_user
from app.dependencies.billing import SubscriptionAccess, require_capability
from app.models.chat import ChatMessage
from app.models.profile import Profile
from app.models.health_metrics import HealthMetrics
from app.models.lab import LabRecord
from app.models.user import User
from app.schemas.chat import (
    ChatHistoryResponse,
    ChatMessageSchema,
    NewConversationResponse,
    SendMessageRequest,
)

router = APIRouter(prefix="/chat")

_AI_SERVICES_URL = os.environ.get("AI_SERVICES_URL", "http://localhost:8001")

# Capability required: "ai_plans" (available on pro and pro_plus tiers)
_chat_gate = require_capability("ai_plans")


def _get_or_create_conversation_id(
    session: Session, user_id: int, agent: str
) -> uuid.UUID:
    """Return the most recent conversation_id for this user+agent, or create a new one."""
    row = session.scalars(
        select(ChatMessage)
        .where(ChatMessage.user_id == user_id, ChatMessage.agent == agent)
        .order_by(ChatMessage.created_at.desc())
        .limit(1)
    ).first()
    return row.conversation_id if row else uuid.uuid4()


@router.get("/{agent}/history", response_model=ChatHistoryResponse)
def get_chat_history(
    agent: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(_chat_gate),
) -> ChatHistoryResponse:
    conversation_id = _get_or_create_conversation_id(session, current_user.id, agent)
    messages = list(
        session.scalars(
            select(ChatMessage)
            .where(
                ChatMessage.user_id == current_user.id,
                ChatMessage.conversation_id == conversation_id,
            )
            .order_by(ChatMessage.created_at.asc())
            .limit(20)
        ).all()
    )
    return ChatHistoryResponse(
        conversation_id=str(conversation_id),
        agent=agent,
        messages=[ChatMessageSchema.model_validate(m) for m in messages],
    )


@router.post("/{agent}/new", response_model=NewConversationResponse)
def new_conversation(
    agent: str,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(_chat_gate),
) -> NewConversationResponse:
    new_id = uuid.uuid4()
    return NewConversationResponse(conversation_id=str(new_id))


@router.post("/message")
async def send_chat_message(
    payload: SendMessageRequest,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
    _access: SubscriptionAccess = Depends(_chat_gate),
) -> StreamingResponse:
    conversation_id = uuid.UUID(payload.conversation_id)

    # Save user message immediately
    user_msg = ChatMessage(
        user_id=current_user.id,
        conversation_id=conversation_id,
        agent=payload.agent,
        role="user",
        content=payload.message,
    )
    session.add(user_msg)
    session.commit()

    # Fetch last 20 messages for history injection
    history_rows = list(
        session.scalars(
            select(ChatMessage)
            .where(ChatMessage.conversation_id == conversation_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(20)
        ).all()
    )
    conversation_history = [
        {"role": m.role, "content": m.content} for m in reversed(history_rows)
    ]

    # Fetch user context from DB
    profile = session.scalars(
        select(Profile).where(Profile.user_id == current_user.id)
    ).first()
    metrics = list(
        session.scalars(
            select(HealthMetrics)
            .where(HealthMetrics.user_id == current_user.id)
            .order_by(HealthMetrics.recorded_at.desc())
            .limit(10)
        ).all()
    )
    labs = list(
        session.scalars(
            select(LabRecord)
            .where(LabRecord.user_id == current_user.id)
            .order_by(LabRecord.recorded_date.desc())
            .limit(20)
        ).all()
    )

    user_context: dict = {}
    if profile:
        user_context["user_profile"] = {
            "user_id": current_user.id,
            "age": profile.age,
            "gender": profile.gender,
            "height_cm": profile.height_cm,
            "weight_kg": profile.weight_kg,
            "conditions": [],
            "dietary_restrictions": [],
            "dietary_preferences": [profile.diet_pattern] if profile.diet_pattern else [],
            "activity_level": profile.activity_level,
        }
    if metrics:
        user_context["health_metrics"] = [
            {
                "weight_kg": m.weight_kg,
                "bmi": m.bmi,
                "steps": m.steps,
                "sleep_hours": m.sleep_hours,
                "recorded_at": m.recorded_at.isoformat() if m.recorded_at else None,
            }
            for m in metrics
        ]
    if labs:
        user_context["lab_records"] = [
            {
                "test_name": l.test_name,
                "value": float(l.value),
                "unit": l.unit,
                "recorded_date": l.recorded_date.isoformat() if l.recorded_date else None,
            }
            for l in labs
        ]

    ai_payload = {
        "agent": payload.agent,
        "message": payload.message,
        "conversation_history": conversation_history,
        "user_context": user_context,
    }

    user_id = current_user.id
    agent = payload.agent
    collected: list[str] = []

    async def generate() -> AsyncIterator[bytes]:
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                async with client.stream(
                    "POST", f"{_AI_SERVICES_URL}/chat", json=ai_payload
                ) as response:
                    if response.status_code != 200:
                        error_msg = json.dumps({"error": "AI service returned an error"})
                        yield f"data: {error_msg}\n\n".encode()
                        yield b"data: [DONE]\n\n"
                        return
                    async for line in response.aiter_lines():
                        if line:
                            yield (line + "\n\n").encode()
                            if line.startswith("data: ") and line != "data: [DONE]":
                                try:
                                    token = json.loads(line[6:]).get("token", "")
                                    if token:
                                        collected.append(token)
                                except (json.JSONDecodeError, KeyError):
                                    pass
            except httpx.RequestError:
                error_msg = json.dumps({"error": "Unable to reach AI service"})
                yield f"data: {error_msg}\n\n".encode()
                yield b"data: [DONE]\n\n"
                return

        # Save assistant message after stream completes
        assistant_content = "".join(collected)
        if assistant_content:
            with SessionLocal() as db:
                db.add(
                    ChatMessage(
                        user_id=user_id,
                        conversation_id=conversation_id,
                        agent=agent,
                        role="assistant",
                        content=assistant_content,
                    )
                )
                db.commit()

    return StreamingResponse(generate(), media_type="text/event-stream")
```

- [ ] **Step 5: Register chat router in v1 router**

In `backend/app/api/v1/router.py`, add after the last import:

```python
from app.api.v1.endpoints.chat import router as chat_router
```

And add after the last `router.include_router(...)` line:

```python
router.include_router(chat_router, tags=["chat"])
```

- [ ] **Step 6: Add ChatMessage import to tests/support.py**

In `backend/tests/support.py`, add after the last `import app.models.*` line:

```python
import app.models.chat  # noqa: F401
```

Note: `chat_messages` uses UUID columns which are PostgreSQL-specific. The `sqlite_compatible_tables()` function in `support.py` already filters out tables with ARRAY/JSONB columns but NOT UUID columns. UUID with `as_uuid=True` uses `postgresql.UUID` — it will be skipped by SQLite. Add it to the exclusion check:

In `backend/tests/support.py`, change the `sqlite_compatible_tables` function to also skip UUID columns:

```python
def sqlite_compatible_tables() -> list:
    """Return tables from Base.metadata that can be created in SQLite.

    Tables with PostgreSQL-specific column types (JSONB, ARRAY, UUID) are excluded.
    """
    from sqlalchemy.dialects.postgresql import UUID as PG_UUID
    compatible = []
    for table in Base.metadata.sorted_tables:
        skip = False
        for col in table.columns:
            if isinstance(col.type, (JSONB, ARRAY, PG_UUID)):
                skip = True
                break
        if not skip:
            compatible.append(table)
    return compatible
```

- [ ] **Step 7: Run the chat tests**

```bash
cd backend && python -m pytest tests/test_chat_api.py -v
```
Expected: 7 PASSED (history empty, history requires auth, history requires paid plan, new returns UUID, new returns different UUIDs, new requires paid plan — 6 tests). The `send_chat_message` endpoint is not tested here because it proxies to ai-services (covered by integration).

- [ ] **Step 8: Run full backend test suite**

```bash
cd backend && python -m pytest tests/ -v
```
Expected: all existing tests PASS + 6 new tests PASS

- [ ] **Step 9: Commit**

```bash
cd backend && git add app/schemas/chat.py app/api/v1/endpoints/chat.py app/api/v1/router.py tests/support.py tests/test_chat_api.py
git commit -m "feat(backend): add chat endpoints with SSE proxy, DB persistence, and paid-plan gate"
```

---

## Task 7 — Frontend: API client chat functions

**Files:**
- Modify: `frontend/lib/api-client.ts`

- [ ] **Step 1: Add chat types and functions to api-client.ts**

At the **end** of `frontend/lib/api-client.ts`, append:

```typescript
// ─── Chat ────────────────────────────────────────────────────────────────────

export type ChatAgent = 'gp' | 'endo' | 'dietitian' | 'trainer' | 'panel';

export type ChatMessageItem = {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
};

export type ChatHistoryResponse = {
  conversation_id: string;
  agent: ChatAgent;
  messages: ChatMessageItem[];
};

export async function getChatHistory(agent: ChatAgent): Promise<ChatHistoryResponse> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${apiBaseUrl}/api/v1/chat/${agent}/history`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    if (res.status === 401) throw new Error('Not authenticated');
    if (res.status === 403) throw new Error('FEATURE_GATED');
    throw new Error(await readError(res));
  }
  return res.json() as Promise<ChatHistoryResponse>;
}

export async function startNewConversation(agent: ChatAgent): Promise<string> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');
  const res = await fetch(`${apiBaseUrl}/api/v1/chat/${agent}/new`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 403) throw new Error('FEATURE_GATED');
    throw new Error(await readError(res));
  }
  const data = await res.json() as { conversation_id: string };
  return data.conversation_id;
}

export async function* streamChatMessage(params: {
  agent: ChatAgent;
  message: string;
  conversation_id: string;
}): AsyncGenerator<string, void, unknown> {
  const token = getAccessToken();
  if (!token) throw new Error('Not authenticated');

  const res = await fetch(`${apiBaseUrl}/api/v1/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(params),
  });

  if (!res.ok) {
    if (res.status === 401) throw new Error('Not authenticated');
    if (res.status === 402 || res.status === 403) throw new Error('FEATURE_GATED');
    throw new Error(await readError(res));
  }

  const reader = res.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data) as { token?: string; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.token) yield parsed.token;
      } catch (e) {
        if (e instanceof Error && e.message !== 'Unexpected token') throw e;
      }
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 3: Commit**

```bash
cd frontend && git add lib/api-client.ts
git commit -m "feat(frontend): add chat API client functions (getChatHistory, startNewConversation, streamChatMessage)"
```

---

## Task 8 — Frontend: Chat components

**Files:**
- Create: `frontend/app/components/chat/chat-bubble.tsx`
- Create: `frontend/app/components/chat/consultation-indicator.tsx`
- Create: `frontend/app/components/chat/streaming-bubble.tsx`
- Create: `frontend/app/components/chat/chat-thread.tsx`
- Create: `frontend/app/components/chat/agent-sidebar.tsx`
- Create: `frontend/app/components/chat/upgrade-prompt.tsx`

- [ ] **Step 1: Create ChatBubble component**

Create `frontend/app/components/chat/chat-bubble.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';

const AGENT_EMOJI: Record<string, string> = {
  gp: '🩺',
  endo: '🔬',
  dietitian: '🥗',
  trainer: '💪',
  panel: '👥',
};

const AGENT_NAME: Record<string, string> = {
  gp: 'General Practitioner',
  endo: 'Endocrinologist',
  dietitian: 'Dietitian',
  trainer: 'Personal Trainer',
  panel: 'Medical Panel',
};

type Props = {
  role: 'user' | 'assistant';
  content: string;
  agent: string;
};

export function ChatBubble({ role, content, agent }: Props) {
  if (role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] rounded-[12px_2px_12px_12px] bg-blue-600 px-4 py-2.5 text-sm text-white">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base">
        {AGENT_EMOJI[agent] ?? '🩺'}
      </div>
      <div className="max-w-[75%] rounded-[2px_12px_12px_12px] border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm whitespace-pre-wrap leading-relaxed">
        {content}
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
          {AGENT_NAME[agent] ?? agent}
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ConsultationIndicator component**

Create `frontend/app/components/chat/consultation-indicator.tsx`:

```tsx
'use client';

const AGENT_NAME: Record<string, string> = {
  gp: 'General Practitioner',
  endo: 'Endocrinologist',
  dietitian: 'Dietitian',
  trainer: 'Personal Trainer',
  panel: 'Medical Panel',
};

type Props = { agent: string };

export function ConsultationIndicator({ agent }: Props) {
  const personaName = AGENT_NAME[agent] ?? agent;
  const isPanel = agent === 'panel' || agent === 'gp';

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-amber-100 text-base">
        ⏳
      </div>
      <div className="max-w-[85%] rounded-[2px_12px_12px_12px] border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
        <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <em>
          Internal consultation is currently underway between your{' '}
          {isPanel ? 'Medical Panel' : personaName} and General Practitioner, before a response
          is given back. Please wait.
        </em>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create StreamingBubble component**

Create `frontend/app/components/chat/streaming-bubble.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';

const AGENT_EMOJI: Record<string, string> = {
  gp: '🩺',
  endo: '🔬',
  dietitian: '🥗',
  trainer: '💪',
  panel: '👥',
};

const AGENT_NAME: Record<string, string> = {
  gp: 'General Practitioner',
  endo: 'Endocrinologist',
  dietitian: 'Dietitian',
  trainer: 'Personal Trainer',
  panel: 'Medical Panel',
};

type Props = {
  content: string;
  agent: string;
};

export function StreamingBubble({ content, agent }: Props) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [content]);

  return (
    <div className="flex items-start gap-2.5">
      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base">
        {AGENT_EMOJI[agent] ?? '🩺'}
      </div>
      <div className="max-w-[75%] rounded-[2px_12px_12px_12px] border border-slate-100 bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm whitespace-pre-wrap leading-relaxed">
        {content}
        <span className="ml-0.5 inline-block h-3 w-0.5 animate-pulse bg-slate-400" />
        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-blue-500">
          {AGENT_NAME[agent] ?? agent}
        </p>
      </div>
      <div ref={endRef} />
    </div>
  );
}
```

- [ ] **Step 4: Create ChatThread component**

Create `frontend/app/components/chat/chat-thread.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { ChatMessageItem } from '@/lib/api-client';
import { ChatBubble } from './chat-bubble';
import { ConsultationIndicator } from './consultation-indicator';
import { StreamingBubble } from './streaming-bubble';

type Props = {
  messages: ChatMessageItem[];
  agent: string;
  isConsulting: boolean;
  streamingContent: string | null;
};

export function ChatThread({ messages, agent, isConsulting, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isConsulting, streamingContent]);

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
      {messages.length === 0 && !isConsulting && !streamingContent ? (
        <p className="text-center text-sm text-slate-400 mt-8">
          No messages yet. Ask a question to get started.
        </p>
      ) : null}
      {messages.map((msg, i) => (
        <ChatBubble
          key={`${msg.created_at}-${i}`}
          role={msg.role}
          content={msg.content}
          agent={agent}
        />
      ))}
      {isConsulting ? <ConsultationIndicator agent={agent} /> : null}
      {streamingContent !== null && !isConsulting ? (
        <StreamingBubble content={streamingContent} agent={agent} />
      ) : null}
      <div ref={bottomRef} />
    </div>
  );
}
```

- [ ] **Step 5: Create AgentSidebar component**

Create `frontend/app/components/chat/agent-sidebar.tsx`:

```tsx
'use client';

import { cn } from '@/lib/utils';
import type { ChatAgent } from '@/lib/api-client';

const AGENTS: { value: ChatAgent; emoji: string; name: string; description: string }[] = [
  { value: 'gp', emoji: '🩺', name: 'General Practitioner', description: 'Holistic health' },
  { value: 'endo', emoji: '🔬', name: 'Endocrinologist', description: 'Labs & metabolic health' },
  { value: 'dietitian', emoji: '🥗', name: 'Dietitian', description: 'Nutrition & meal plans' },
  { value: 'trainer', emoji: '💪', name: 'Personal Trainer', description: 'Exercise & fitness' },
  { value: 'panel', emoji: '👥', name: 'Medical Panel', description: 'Full panel consultation' },
];

type Props = {
  activeAgent: ChatAgent;
  onSelectAgent: (agent: ChatAgent) => void;
  onNewConversation: () => void;
  isStreaming: boolean;
};

export function AgentSidebar({ activeAgent, onSelectAgent, onNewConversation, isStreaming }: Props) {
  return (
    <div className="flex w-56 flex-shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <div className="px-3 pt-4 pb-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
          Specialists
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {AGENTS.map(({ value, emoji, name, description }) => (
          <button
            key={value}
            onClick={() => !isStreaming && onSelectAgent(value)}
            disabled={isStreaming}
            className={cn(
              'flex w-full flex-col gap-0.5 px-3 py-2.5 text-left transition-colors',
              value === activeAgent
                ? 'border-l-2 border-blue-600 bg-blue-50'
                : 'border-l-2 border-transparent hover:bg-slate-100',
              value === 'panel' ? 'mt-2 border-t border-slate-200 pt-3' : ''
            )}
          >
            <span className="text-sm font-semibold text-slate-800">
              {emoji} {name}
            </span>
            <span className="text-[11px] text-slate-500">{description}</span>
            {value === activeAgent ? (
              <span className="text-[10px] font-semibold text-blue-500">Active</span>
            ) : null}
          </button>
        ))}
      </div>
      <div className="border-t border-slate-200 px-3 py-3">
        <button
          onClick={onNewConversation}
          disabled={isStreaming}
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors"
        >
          + New conversation
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Create UpgradePrompt component**

Create `frontend/app/components/chat/upgrade-prompt.tsx`:

```tsx
import Link from 'next/link';

export function UpgradePrompt() {
  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center">
      <p className="text-2xl">🔒</p>
      <h3 className="text-base font-semibold text-slate-800">
        AI Medical Consultation is a Pro feature
      </h3>
      <p className="max-w-xs text-sm text-slate-500">
        Upgrade to Pro to chat with your Endocrinologist, Dietitian, Personal Trainer, and GP —
        personalised to your health data.
      </p>
      <Link
        href="/funnel/upgrade"
        className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
      >
        Upgrade to Pro
      </Link>
    </div>
  );
}
```

- [ ] **Step 7: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors

- [ ] **Step 8: Commit**

```bash
cd frontend && git add app/components/chat/
git commit -m "feat(frontend): add chat UI components (ChatBubble, ConsultationIndicator, StreamingBubble, ChatThread, AgentSidebar, UpgradePrompt)"
```

---

## Task 9 — Frontend: Refactor interaction.tsx

**Files:**
- Modify: `frontend/app/components/interaction.tsx`

- [ ] **Step 1: Replace interaction.tsx with new chat UI**

Replace the **entire contents** of `frontend/app/components/interaction.tsx`:

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import {
  type ChatAgent,
  type ChatMessageItem,
  getChatHistory,
  startNewConversation,
  streamChatMessage,
  fetchAdherenceSummary,
} from '@/lib/api-client';
import { AgentSidebar } from './chat/agent-sidebar';
import { ChatThread } from './chat/chat-thread';
import { UpgradePrompt } from './chat/upgrade-prompt';
import { InputBox } from './input-box';

export function InteractionView() {
  const [activeAgent, setActiveAgent] = useState<ChatAgent>('gp');
  const [conversationId, setConversationId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [isConsulting, setIsConsulting] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const [isGated, setIsGated] = useState(false);
  const [consistencyLevel, setConsistencyLevel] = useState<string | null>(null);
  const [planRefreshNeeded, setPlanRefreshNeeded] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  const loadHistory = useCallback(async (agent: ChatAgent) => {
    setError('');
    try {
      const history = await getChatHistory(agent);
      setConversationId(history.conversation_id);
      setMessages(history.messages);
    } catch (err) {
      if (err instanceof Error && err.message === 'FEATURE_GATED') {
        setIsGated(true);
      } else {
        setError('Failed to load conversation history.');
      }
    }
  }, []);

  useEffect(() => {
    loadHistory(activeAgent);
    fetchAdherenceSummary()
      .then((summary) => {
        if (summary) {
          setConsistencyLevel(summary.consistency_level);
          setPlanRefreshNeeded(summary.plan_refresh_needed);
        }
      })
      .catch(() => {});
  }, [activeAgent, loadHistory]);

  async function handleSelectAgent(agent: ChatAgent) {
    if (isStreaming) return;
    setActiveAgent(agent);
    setStreamingContent(null);
    setIsConsulting(false);
    setError('');
  }

  async function handleNewConversation() {
    if (isStreaming) return;
    try {
      const newId = await startNewConversation(activeAgent);
      setConversationId(newId);
      setMessages([]);
      setStreamingContent(null);
      setIsConsulting(false);
      setError('');
    } catch {
      setError('Failed to start new conversation.');
    }
  }

  async function handleSubmit(prompt: string) {
    if (!conversationId || isStreaming) return;
    setError('');
    setIsConsulting(true);
    setIsStreaming(true);
    setStreamingContent(null);

    // Add user message optimistically
    const userMsg: ChatMessageItem = {
      role: 'user',
      content: prompt,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const controller = new AbortController();
    abortRef.current = controller;

    let accumulated = '';
    let firstToken = true;
    try {
      for await (const token of streamChatMessage({
        agent: activeAgent,
        message: prompt,
        conversation_id: conversationId,
      })) {
        // First token: hide consultation indicator, show streaming bubble.
        // Use a local variable (not React state) to avoid stale closure reads.
        if (firstToken) {
          setIsConsulting(false);
          firstToken = false;
        }
        accumulated += token;
        setStreamingContent(accumulated);
      }

      // Stream complete — promote to permanent message
      if (accumulated) {
        const assistantMsg: ChatMessageItem = {
          role: 'assistant',
          content: accumulated,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch (err) {
      setIsConsulting(false);
      if (err instanceof Error && err.message === 'FEATURE_GATED') {
        setIsGated(true);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : 'Unable to reach the assistant. Please try again.'
        );
      }
    } finally {
      setStreamingContent(null);
      setIsConsulting(false);
      setIsStreaming(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 pb-20 md:pb-0 md:pl-64">
      <div className="mx-auto flex h-[calc(100vh-0px)] max-w-5xl flex-col px-4 py-8">
        {/* Adherence banner */}
        {planRefreshNeeded ? (
          <div className="mb-4 rounded-xl bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
            <strong>Your adherence patterns have changed.</strong> Consistency level:{' '}
            <em>{consistencyLevel}</em>. Ask your GP or Medical Panel for an updated plan.
          </div>
        ) : null}

        {/* Page header */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">
            Chat
          </p>
          <h1 className="text-2xl font-bold text-slate-900">Your Medical Panel</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ask your specialists anything. Every response is reviewed by your GP before delivery.
          </p>
        </div>

        {isGated ? (
          <UpgradePrompt />
        ) : (
          <div className="flex flex-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            {/* Agent selector sidebar */}
            <AgentSidebar
              activeAgent={activeAgent}
              onSelectAgent={handleSelectAgent}
              onNewConversation={handleNewConversation}
              isStreaming={isStreaming}
            />

            {/* Chat area */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <ChatThread
                messages={messages}
                agent={activeAgent}
                isConsulting={isConsulting}
                streamingContent={streamingContent}
              />

              {/* Input */}
              <div className="border-t border-slate-200 bg-white px-4 py-3">
                {error ? (
                  <p className="mb-2 text-sm text-red-600" role="alert">
                    {error}
                  </p>
                ) : null}
                <InputBox onSubmit={handleSubmit} isSubmitting={isStreaming} />
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit
```
Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 3: Run the dev server and smoke-test manually**

```bash
# Terminal 1
cd ai-services && uvicorn app.main:app --reload --port 8001

# Terminal 2
cd backend && uvicorn app.main:app --reload --port 8000

# Terminal 3
cd frontend && npm run dev
```

Navigate to `http://localhost:3000/interaction`. Verify:
- Sidebar shows 5 personas
- Selecting a persona loads history (empty for new users)
- Sending a message shows "consultation underway" indicator
- Response streams in token by token
- "New conversation" clears the thread
- Free users (no subscription) see the upgrade prompt

- [ ] **Step 4: Commit**

```bash
cd frontend && git add app/components/interaction.tsx
git commit -m "feat(frontend): refactor interaction page to multi-agent streamed chat UI"
```

---

## Task 10 — Final: integration commit and memory update

- [ ] **Step 1: Run all tests end-to-end**

```bash
# AI services
cd ai-services && python -m pytest tests/ -v

# Backend
cd backend && python -m pytest tests/ -v

# Frontend TypeScript
cd frontend && npx tsc --noEmit
```
Expected: all tests PASS, no TypeScript errors.

- [ ] **Step 2: Create PR**

```bash
gh pr create \
  --title "feat(chat): multi-agent streamed chat with GP consensus" \
  --body "$(cat <<'EOF'
## Summary
- New POST /chat SSE endpoint in ai-services: runs specialist agent(s) then streams GPAgent's validated response
- stream_generate added to all LLM providers (Groq, Mistral, Fallback, Mock)
- Backend: chat_messages DB table + 3 endpoints (message, history, new) with paid-plan gate
- Frontend: /interaction page evolved into sidebar + bubble chat UI with ConsultationIndicator

## Test plan
- [ ] ai-services: python -m pytest tests/ -v (all pass)
- [ ] backend: python -m pytest tests/ -v (all pass)
- [ ] frontend: npx tsc --noEmit (no errors)
- [ ] Manual: select each persona, send message, verify consultation indicator appears then streams
- [ ] Manual: new conversation clears thread
- [ ] Manual: free user sees upgrade prompt

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

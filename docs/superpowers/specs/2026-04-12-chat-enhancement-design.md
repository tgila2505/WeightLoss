# Chat Enhancement — Design Spec
**Date:** 2026-04-12  
**Feature:** Multi-agent chat page with 5 selectable specialist personas  
**Status:** Approved — ready for implementation planning

---

## Overview

Evolve the existing `/interaction` page into a full multi-agent chat interface. Authenticated paid users can select a specialist persona, send free-text health questions, and receive streamed, medically-validated responses grounded in their profile, lab records, and health metrics.

The page already exists at `frontend/app/interaction/page.tsx` and `frontend/app/components/interaction.tsx`. **Do not create a new page.** The nav already labels this route "Chat".

---

## The 5 Personas

| Persona | Nav label | Underlying agent | `agent` value |
|---|---|---|---|
| General Practitioner | GP | `GPAgent` | `gp` |
| Endocrinologist | Endo | `LabInterpretationAgent` | `endo` |
| Dietitian | Dietitian | `MealPlanAgent` | `dietitian` |
| Personal Trainer | Trainer | `PersonalTrainerAgent` | `trainer` |
| Medical Panel | Panel | Full cascade | `panel` |

---

## Architecture & Data Flow

### Single Persona (e.g. Dietitian)

```
User message
  → Frontend (/interaction)
  → Backend POST /api/v1/chat/message  [auth + paid-plan check]
  → AI Services POST /chat
      1. MealPlanAgent runs  (user context + last 10 turns injected)
      2. GPAgent validates   (Dietitian output as specialist input)
      3. GP-endorsed response streams back via SSE
  → Backend proxies SSE stream to frontend
  → Frontend renders tokens into StreamingBubble
  → Backend saves turn to chat_messages DB (user msg immediately, assistant msg on [DONE])
```

### Medical Panel

```
AI Services POST /chat (agent=panel)
  1. LabInterpretationAgent (Endo)
  2. MealPlanAgent (Dietitian)  ← receives Endo output
  3. PersonalTrainerAgent       ← receives Endo + Dietitian outputs
  4. GPAgent synthesises all three
  5. GP synthesis streams back
```

### GP Persona

Same as Medical Panel — GP receives full specialist cascade output and acts as primary voice.

### GP Consensus Rule

**Every single-agent response goes through GP review before reaching the user.** This is non-negotiable for medical quality. The GP acts as quality gate, not just synthesiser.

---

## Section 1 — AI Services Changes

### New endpoint: `POST /chat`

**Request schema (`ChatRequest`):**
```python
class ChatRequest(BaseModel):
    agent: Literal["gp", "endo", "dietitian", "trainer", "panel"]
    message: str
    conversation_history: list[dict]  # [{"role": "user"|"assistant", "content": str}] last 20 messages
    user_context: UserContextPayload  # profile, metrics, labs, master_profile
```

**Response:** `StreamingResponse(media_type="text/event-stream")`

SSE format:
```
data: {"token": "Based"}
data: {"token": " on your HbA1c..."}
...
data: [DONE]
```

**Streaming phases:**
- **Phase 1 — Consultation**: Internal agent(s) run synchronously. No tokens emitted yet. Frontend shows "consultation underway" message because no token has arrived.
- **Phase 2 — Stream**: GPAgent's LLM call uses `stream=True`, emitting tokens as they generate.

### Agent routing table

| `agent` | Agents invoked | GP role |
|---|---|---|
| `dietitian` | MealPlanAgent → GPAgent | Consensus validator |
| `endo` | LabInterpretationAgent → GPAgent | Consensus validator |
| `trainer` | PersonalTrainerAgent → GPAgent | Consensus validator |
| `gp` | Full cascade → GPAgent | Primary voice |
| `panel` | Full cascade → GPAgent | Primary synthesiser |

### Conversation history injection

The last 20 messages (up to 10 user + 10 assistant) are prepended to the user prompt as a formatted prior-context block. Not passed as separate LLM message objects — keeps it provider-agnostic across Groq/Mistral.

### New classes required in ai-services

- `stream_generate(prompt, max_tokens) -> Iterator[str]` added to `LLMProvider` protocol + all implementations (Groq, Mistral, Fallback). `MockProvider.stream_generate` yields words one at a time from its fixed response — no real streaming needed for tests.
- `ChatRequest` Pydantic model
- `ChatRouter` class — selects which agents to invoke based on `agent` field
- `POST /chat` endpoint in `main.py` using `StreamingResponse`

---

## Section 2 — Backend Changes

### New DB model

```python
class ChatMessage(Base):
    __tablename__ = "chat_messages"
    id              = Column(UUID, primary_key=True, default=uuid4)
    user_id         = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    conversation_id = Column(UUID, nullable=False, index=True)
    agent           = Column(String, nullable=False)   # dietitian|endo|trainer|gp|panel
    role            = Column(String, nullable=False)   # user|assistant
    content         = Column(Text, nullable=False)
    created_at      = Column(DateTime(timezone=True), server_default=func.now())
```

One Alembic migration required.

### New endpoints (`backend/app/api/v1/endpoints/chat.py`)

| Method | Path | Auth | Plan | Purpose |
|---|---|---|---|---|
| `POST` | `/api/v1/chat/message` | required | paid | Send message — stream SSE through from ai-services |
| `GET` | `/api/v1/chat/{agent}/history` | required | paid | Returns active `conversation_id` + last 20 messages |
| `POST` | `/api/v1/chat/{agent}/new` | required | paid | Creates new `conversation_id`, returns it |

### Streaming proxy logic (`POST /api/v1/chat/message`)

1. Verify JWT (`get_current_user` dependency)
2. Verify paid plan (`require_active_subscription` dependency — already exists)
3. Save user message to `chat_messages` immediately (with `conversation_id` from request)
4. Fetch user context (profile + metrics + labs) — reuse existing service calls
5. Fetch last 20 messages from `chat_messages` for the active `conversation_id`
6. Open `httpx.AsyncClient` stream to `ai-services POST /chat`
7. Yield each SSE chunk directly to frontend while collecting tokens
8. On `[DONE]` chunk: save complete assistant response to `chat_messages`
9. Return `StreamingResponse(media_type="text/event-stream")`

### Upgrade gate

`require_active_subscription` already exists. If check fails → `402`. Frontend maps 402 → `UpgradePrompt`.

---

## Section 3 — Frontend Changes

### Layout

- **Sidebar (Option B)**: Fixed-width left sidebar listing all 5 personas. Active persona highlighted. Collapses to icon-strip on mobile.
- **Chat area (Option A — Bubbles)**: Message thread with agent avatar on left bubbles, user messages as right-aligned blue bubbles. Input fixed at bottom.

### New components

| Component | File | Purpose |
|---|---|---|
| `AgentSidebar` | `components/chat/agent-sidebar.tsx` | Persona list, active state, "New conversation" button |
| `ChatThread` | `components/chat/chat-thread.tsx` | Scrollable message list, auto-scrolls to newest |
| `ChatBubble` | `components/chat/chat-bubble.tsx` | Single turn: avatar + bubble, `user` vs `assistant` role |
| `ConsultationIndicator` | `components/chat/consultation-indicator.tsx` | Amber pulsing bubble shown while awaiting first token |
| `StreamingBubble` | `components/chat/streaming-bubble.tsx` | Assembles SSE tokens into text in real time |
| `UpgradePrompt` | `components/chat/upgrade-prompt.tsx` | Shown to free users instead of input |

### State & data flow

- **On page mount**: Check subscription status. If free → show `UpgradePrompt`.
- **On agent switch**: `GET /api/v1/chat/{agent}/history` → render previous turns, store `conversation_id` in state.
- **On send**:
  1. Append user bubble to thread immediately (optimistic)
  2. Show `ConsultationIndicator`
  3. `fetch` `POST /api/v1/chat/message` with `ReadableStream`
  4. First token received → hide `ConsultationIndicator`, mount `StreamingBubble`
  5. Each SSE `data:` chunk → append token to `StreamingBubble`
  6. `[DONE]` → finalise bubble, re-enable input
- **New conversation**: `POST /api/v1/chat/{agent}/new` → clear thread, update `conversation_id`

### Input behaviour

- Input and Send button **disabled** while streaming
- Placeholder text: `Ask your [Persona name]...`
- Input re-enabled immediately on `[DONE]` or on error

### What gets removed from current `interaction.tsx`

- `inferIntent`, `buildMealPlanPrompt`, `fetchSevenDayMeals` (meal-plan-specific logic)
- `getInteractionHistory` / `appendInteractionHistory` (localStorage history)
- `submitOrchestratorRequest` call

The existing plan-generation behaviour (adherence summary, plan refresh banner) should be preserved separately — move it to its own component or keep in the page shell, so the chat area is purely the new multi-agent thread.

---

## Section 4 — Error Handling

| Scenario | Behaviour |
|---|---|
| SSE connection error mid-stream | Show inline error bubble: "Response interrupted. Please try again." Re-enable input. |
| AI services unreachable (503) | Error bubble: "The AI service is temporarily unavailable. Please try again shortly." |
| Both providers rate-limited | Error bubble with the rate-limit reset time from the 503 detail field. |
| Network timeout | Error bubble: "Request timed out. Please check your connection." |
| 402 (free plan) | Show `UpgradePrompt` — never show an error message for this case. |

---

## Section 5 — Testing

### AI services tests (3)
- `test_chat_single_agent_gp_consensus`: Dietitian request → verifies both MealPlanAgent and GPAgent are called
- `test_chat_panel_full_cascade`: Panel request → verifies all 4 agents called in order
- `test_chat_streaming_response`: Confirms endpoint returns `text/event-stream` content-type and emits `[DONE]`

### Backend tests (3)
- `test_chat_message_saves_turns`: POST message → both user and assistant turns saved to DB
- `test_chat_history_returns_conversation`: GET history → returns correct turns for agent + conversation_id
- `test_chat_new_conversation`: POST new → returns new UUID, old conversation_id still in DB

---

## Out of Scope

- Push notifications for long-running consultations
- Exporting conversation history
- Sharing a conversation (like shared plans)
- Displaying individual specialist sub-responses within Panel mode (GP synthesis only shown)
- Voice input

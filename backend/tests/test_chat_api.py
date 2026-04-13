from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select as sa_select
from tests.support import ApiTestCase

import app.models.chat  # noqa: F401
from app.models.chat import ChatMessage

SSE_RESPONSE = b'data: {"token": "Hello"}\n\ndata: {"token": " world"}\n\ndata: [DONE]\n\n'


def _make_httpx_mock(sse_bytes: bytes = SSE_RESPONSE):
    """Patch httpx.AsyncClient so stream() yields canned SSE lines."""
    mock_response = MagicMock()
    mock_response.status_code = 200

    async def aiter_lines():
        for line in sse_bytes.decode().split("\n"):
            if line:
                yield line

    mock_response.aiter_lines = aiter_lines
    mock_response.__aenter__ = AsyncMock(return_value=mock_response)
    mock_response.__aexit__ = AsyncMock(return_value=False)

    mock_client = MagicMock()
    mock_client.stream = MagicMock(return_value=mock_response)
    mock_client.__aenter__ = AsyncMock(return_value=mock_client)
    mock_client.__aexit__ = AsyncMock(return_value=False)

    return patch("app.api.v1.endpoints.chat.httpx.AsyncClient", return_value=mock_client)


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


class TestSendChatMessage(ApiTestCase):
    def _get_conversation_id(self, user, agent: str = "dietitian") -> str:
        """Start a new conversation and return its ID."""
        self.give_user_pro_subscription(user)
        headers = self.auth_headers_for_user(user)
        resp = self.client.post(f"/api/v1/chat/{agent}/new", headers=headers)
        self.assertEqual(resp.status_code, 200)
        return resp.json()["conversation_id"]

    def test_send_message_saves_user_turn(self):
        user = self.create_user()
        conversation_id = self._get_conversation_id(user)
        headers = self.auth_headers_for_user(user)

        with _make_httpx_mock(), patch(
            "app.api.v1.endpoints.chat.SessionLocal", self.session_factory
        ):
            resp = self.client.post(
                "/api/v1/chat/message",
                json={
                    "agent": "dietitian",
                    "message": "What should I eat?",
                    "conversation_id": conversation_id,
                },
                headers=headers,
            )
        self.assertEqual(resp.status_code, 200)

        # User turn must be in DB
        with self.session_factory() as session:
            msgs = list(session.scalars(
                sa_select(ChatMessage)
                .where(ChatMessage.role == "user")
                .order_by(ChatMessage.created_at.asc())
            ).all())
        self.assertTrue(any(m.content == "What should I eat?" for m in msgs))

    def test_send_message_saves_assistant_turn(self):
        user = self.create_user()
        conversation_id = self._get_conversation_id(user)
        headers = self.auth_headers_for_user(user)

        with _make_httpx_mock(), patch(
            "app.api.v1.endpoints.chat.SessionLocal", self.session_factory
        ):
            resp = self.client.post(
                "/api/v1/chat/message",
                json={
                    "agent": "dietitian",
                    "message": "What should I eat?",
                    "conversation_id": conversation_id,
                },
                headers=headers,
            )
        self.assertEqual(resp.status_code, 200)

        # Assistant turn (assembled tokens) must be in DB
        with self.session_factory() as session:
            msgs = list(session.scalars(
                sa_select(ChatMessage)
                .where(ChatMessage.role == "assistant")
                .order_by(ChatMessage.created_at.asc())
            ).all())
        self.assertTrue(any("Hello world" in m.content for m in msgs))

    def test_send_message_returns_event_stream(self):
        user = self.create_user()
        conversation_id = self._get_conversation_id(user)
        headers = self.auth_headers_for_user(user)

        with _make_httpx_mock(), patch(
            "app.api.v1.endpoints.chat.SessionLocal", self.session_factory
        ):
            resp = self.client.post(
                "/api/v1/chat/message",
                json={
                    "agent": "dietitian",
                    "message": "Test",
                    "conversation_id": conversation_id,
                },
                headers=headers,
            )
        self.assertIn("text/event-stream", resp.headers.get("content-type", ""))

    def test_send_message_requires_auth(self):
        resp = self.client.post(
            "/api/v1/chat/message",
            json={
                "agent": "dietitian",
                "message": "hi",
                "conversation_id": "00000000-0000-0000-0000-000000000000",
            },
        )
        self.assertEqual(resp.status_code, 401)

    def test_send_message_requires_paid_plan(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.post(
            "/api/v1/chat/message",
            json={
                "agent": "dietitian",
                "message": "hi",
                "conversation_id": "00000000-0000-0000-0000-000000000000",
            },
            headers=headers,
        )
        self.assertEqual(resp.status_code, 403)

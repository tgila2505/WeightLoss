from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

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

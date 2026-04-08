# backend/tests/test_profile_state_api.py
from tests.support import ApiTestCase


class TestMindMapStateApi(ApiTestCase):
    def test_get_mindmap_state_returns_empty_when_no_state(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/mindmap/state", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"], {})

    def test_put_mindmap_state_creates_and_returns_state(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        payload = {"state": {"version": 2, "nodes": [], "edges": []}}
        resp = self.client.put("/api/v1/mindmap/state", json=payload, headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"]["version"], 2)

    def test_put_mindmap_state_upserts(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        self.client.put("/api/v1/mindmap/state", json={"state": {"version": 1}}, headers=headers)
        resp = self.client.put("/api/v1/mindmap/state", json={"state": {"version": 2}}, headers=headers)
        self.assertEqual(resp.json()["state"]["version"], 2)

    def test_mindmap_state_isolated_per_user(self):
        user_a = self.create_user(email="a@test.com")
        user_b = self.create_user(email="b@test.com")
        self.client.put(
            "/api/v1/mindmap/state",
            json={"state": {"owner": "a"}},
            headers=self.auth_headers_for_user(user_a),
        )
        resp = self.client.get("/api/v1/mindmap/state", headers=self.auth_headers_for_user(user_b))
        self.assertEqual(resp.json()["state"], {})

    def test_get_mindmap_state_requires_auth(self):
        resp = self.client.get("/api/v1/mindmap/state")
        self.assertEqual(resp.status_code, 401)


class TestWizardStateApi(ApiTestCase):
    def test_get_wizard_state_returns_empty_when_no_state(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        resp = self.client.get("/api/v1/wizard/state", headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"], {})

    def test_put_wizard_state_upserts(self):
        user = self.create_user()
        headers = self.auth_headers_for_user(user)
        payload = {"state": {"currentStepIndex": 2, "steps": {}}}
        resp = self.client.put("/api/v1/wizard/state", json=payload, headers=headers)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()["state"]["currentStepIndex"], 2)

    def test_wizard_state_isolated_per_user(self):
        user_a = self.create_user(email="c@test.com")
        user_b = self.create_user(email="d@test.com")
        self.client.put(
            "/api/v1/wizard/state",
            json={"state": {"currentStepIndex": 3}},
            headers=self.auth_headers_for_user(user_a),
        )
        resp = self.client.get("/api/v1/wizard/state", headers=self.auth_headers_for_user(user_b))
        self.assertEqual(resp.json()["state"], {})

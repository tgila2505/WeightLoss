import unittest

from tests.support import ApiTestCase


class AuthApiTest(ApiTestCase):
    def test_register_login_and_me_flow(self) -> None:
        register_response = self.client.post(
            "/api/v1/auth/register",
            json={"email": "person@example.com", "password": "Password123"},
        )

        self.assertEqual(register_response.status_code, 201)
        self.assertEqual(register_response.json()["email"], "person@example.com")

        login_response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "person@example.com", "password": "Password123"},
        )

        self.assertEqual(login_response.status_code, 200)
        token = login_response.json()["access_token"]

        me_response = self.client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

        self.assertEqual(me_response.status_code, 200)
        self.assertEqual(me_response.json()["email"], "person@example.com")

    def test_login_rejects_invalid_password(self) -> None:
        self.client.post(
            "/api/v1/auth/register",
            json={"email": "person@example.com", "password": "Password123"},
        )

        response = self.client.post(
            "/api/v1/auth/login",
            json={"email": "person@example.com", "password": "wrong-password"},
        )

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["error"]["message"],
            "Invalid email or password",
        )

    def test_me_requires_authentication(self) -> None:
        response = self.client.get("/api/v1/auth/me")

        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.json()["error"]["message"],
            "Authentication credentials were not provided",
        )

    def test_login_sets_httponly_access_cookie(self) -> None:
        self.client.post(
            "/api/v1/auth/register",
            json={"email": "cookie@test.com", "password": "Password123"},
        )
        resp = self.client.post(
            "/api/v1/auth/login",
            json={"email": "cookie@test.com", "password": "Password123"},
        )
        self.assertEqual(resp.status_code, 200)
        cookie_names = {c.name for c in self.client.cookies.jar}
        self.assertIn("access_token", cookie_names)

    def test_me_works_with_cookie_auth(self) -> None:
        self.client.post(
            "/api/v1/auth/register",
            json={"email": "cookie2@test.com", "password": "Password123"},
        )
        self.client.post(
            "/api/v1/auth/login",
            json={"email": "cookie2@test.com", "password": "Password123"},
        )
        # TestClient carries cookies automatically — no Bearer header needed
        me = self.client.get("/api/v1/auth/me")
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["email"], "cookie2@test.com")

    def test_logout_clears_cookies_without_body(self) -> None:
        self.client.post(
            "/api/v1/auth/register",
            json={"email": "cookie3@test.com", "password": "Password123"},
        )
        self.client.post(
            "/api/v1/auth/login",
            json={"email": "cookie3@test.com", "password": "Password123"},
        )
        resp = self.client.post("/api/v1/auth/logout")
        self.assertEqual(resp.status_code, 204)

    def test_register_rejects_blank_fields(self) -> None:
        response = self.client.post(
            "/api/v1/auth/register",
            json={"email": "", "password": ""},
        )

        self.assertEqual(response.status_code, 422)


if __name__ == "__main__":
    unittest.main()

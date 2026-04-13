from tests.support import ApiTestCase


class CorsTest(ApiTestCase):
    def test_cors_allows_configured_origin(self) -> None:
        resp = self.client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertIn(
            "http://localhost:3000",
            resp.headers.get("access-control-allow-origin", ""),
        )

    def test_cors_rejects_unknown_origin(self) -> None:
        resp = self.client.options(
            "/api/v1/auth/login",
            headers={
                "Origin": "http://evil.com",
                "Access-Control-Request-Method": "POST",
            },
        )
        self.assertNotIn(
            "http://evil.com",
            resp.headers.get("access-control-allow-origin", ""),
        )

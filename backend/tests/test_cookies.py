import unittest
from unittest.mock import MagicMock

from app.core.cookies import set_auth_cookies, clear_auth_cookies


class CookieHelperTest(unittest.TestCase):
    def test_set_auth_cookies_sets_two_httponly_cookies(self) -> None:
        resp = MagicMock()
        set_auth_cookies(resp, "access-tok", "refresh-tok")
        self.assertEqual(resp.set_cookie.call_count, 2)
        names = [c.kwargs["key"] for c in resp.set_cookie.call_args_list]
        self.assertIn("access_token", names)
        self.assertIn("refresh_token", names)
        for call in resp.set_cookie.call_args_list:
            self.assertTrue(call.kwargs["httponly"])
            self.assertEqual(call.kwargs["samesite"], "lax")

    def test_clear_auth_cookies_deletes_both(self) -> None:
        resp = MagicMock()
        clear_auth_cookies(resp)
        self.assertEqual(resp.delete_cookie.call_count, 2)

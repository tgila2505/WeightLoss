import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)


class SecurityTest(unittest.TestCase):
    def test_password_hash_round_trip(self) -> None:
        hashed_password = get_password_hash("password123")

        self.assertNotEqual(hashed_password, "password123")
        self.assertTrue(verify_password("password123", hashed_password))
        self.assertFalse(verify_password("wrong-password", hashed_password))

    def test_access_token_round_trip(self) -> None:
        token = create_access_token("42")

        payload = decode_access_token(token)

        self.assertEqual(payload["sub"], "42")

    def test_decode_access_token_rejects_invalid_token(self) -> None:
        with self.assertRaisesRegex(ValueError, "Invalid token"):
            decode_access_token("not-a-real-token")


if __name__ == "__main__":
    unittest.main()

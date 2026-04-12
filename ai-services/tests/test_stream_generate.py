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

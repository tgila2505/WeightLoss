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

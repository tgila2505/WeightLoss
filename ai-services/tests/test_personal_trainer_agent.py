from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.personal_trainer_agent import PersonalTrainerAgent
from app.agents.interface import AgentInput


_LLM_RESPONSE = json.dumps({
    "activity": [
        {"title": "Brisk Walking", "frequency": "30 minutes, 5 days/week"},
        {"title": "Resistance Training", "frequency": "45 minutes, 3 days/week"},
    ],
    "behavioral_actions": [
        "Schedule workouts in your calendar like appointments.",
        "Prepare your gym bag the night before.",
    ],
    "adherence_signals": [
        {"name": "daily_walk_completed", "completed": False, "score": None},
        {"name": "strength_session_done", "completed": False, "score": None},
    ],
    "weekly_plan": {
        "exercise_types": ["walking", "resistance training"],
        "frequency_per_week": 5,
        "duration_minutes": 30,
        "intensity": "moderate",
        "progression_notes": "Add 5 minutes per week after 2 consistent weeks.",
    },
})

_TRAINER_INPUT = AgentInput(
    prompt="Build me an activity plan",
    task_type="trainer",
    variables={
        "health_metrics": [
            {"weight_kg": 90, "steps": 4500, "sleep_hours": 7.0, "weight_trend": "stable"}
        ],
        "adherence_signals": [],
    },
)


class PersonalTrainerAgentTest(unittest.TestCase):
    def test_rule_based_produces_structured_weekly_plan(self) -> None:
        agent = PersonalTrainerAgent()
        result = agent.run(_TRAINER_INPUT)

        self.assertEqual(result.status, "success")
        self.assertIn("activity", result.data)
        self.assertIn("weekly_plan", result.data)
        self.assertIn("frequency_per_week", result.data["weekly_plan"])
        self.assertIn("intensity", result.data["weekly_plan"])
        self.assertGreater(len(result.data["activity"]), 0)
        self.assertEqual(result.metadata["agent_name"], "trainer")

    def test_rule_based_low_steps_recommends_walking(self) -> None:
        agent = PersonalTrainerAgent()
        result = agent.run(AgentInput(
            prompt="What should I do?",
            task_type="trainer",
            variables={
                "health_metrics": [{"steps": 3000, "weight_trend": "increasing"}],
                "adherence_signals": [],
            },
        ))
        activity_titles = [a["title"].lower() for a in result.data["activity"]]
        self.assertTrue(any("walk" in t for t in activity_titles))

    def test_llm_path_uses_provider(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.return_value = _LLM_RESPONSE

        agent = PersonalTrainerAgent(provider=mock_provider)
        result = agent.run(_TRAINER_INPUT)

        self.assertEqual(result.status, "success")
        self.assertTrue(result.metadata.get("llm_generated"))
        self.assertIn("weekly_plan", result.data)
        self.assertEqual(result.data["weekly_plan"]["frequency_per_week"], 5)
        mock_provider.generate.assert_called_once()

    def test_llm_failure_falls_back_to_rule_based(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.side_effect = RuntimeError("LLM error")

        agent = PersonalTrainerAgent(provider=mock_provider)
        result = agent.run(_TRAINER_INPUT)

        self.assertEqual(result.status, "success")
        self.assertIn("weekly_plan", result.data)
        self.assertFalse(result.metadata.get("llm_generated"))

    def test_reads_endocrinologist_constraints_from_specialist_outputs(self) -> None:
        agent = PersonalTrainerAgent()
        result = agent.run(AgentInput(
            prompt="Plan my workout",
            task_type="trainer",
            variables={
                "health_metrics": [{"steps": 6000}],
                "adherence_signals": [],
                "specialist_outputs": {
                    "endocrinologist": {
                        "data": {"risks": {"diabetes_risk": True}},
                        "content": "Lab interpretation generated",
                    }
                },
            },
        ))
        # When diabetes_risk is True, intensity should be low or moderate, not high
        self.assertIn(result.data["weekly_plan"]["intensity"], ("low", "moderate"))


if __name__ == "__main__":
    unittest.main()

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.gp_agent import GPAgent
from app.agents.interface import AgentInput

_LLM_RESPONSE = json.dumps({
    "patient_response": "Based on your lab results and activity data, here is your personalised plan.",
    "action_plan": [
        "Limit added sugar to under 25g per day.",
        "Walk 30 minutes every day this week.",
        "Follow the meal plan provided by your Dietitian.",
    ],
    "urgent_flags": [],
    "conflict_resolutions": ["Endocrinologist sugar limit takes precedence over general carb advice."],
    "motivation_note": "You are making real progress — keep going.",
})

_SPECIALIST_OUTPUTS = {
    "endocrinologist": {
        "content": "Lab interpretation generated",
        "data": {
            "lab_insights": [{"test_name": "HbA1c", "status": "high", "summary": "Elevated."}],
            "risks": {"diabetes_risk": True},
            "lab_actions": ["Prioritize lower-sugar meals."],
            "clinical_narrative": "Your HbA1c indicates poor glucose control.",
            "dietary_constraints": ["avoid added sugar"],
        },
    },
    "dietitian": {
        "content": "Meal plan generated",
        "data": {
            "meals": [{"meal": "breakfast", "name": "Eggs with avocado"}],
            "meal_biomarker_adjustments": ["lower_sugar"],
        },
    },
    "trainer": {
        "content": "Activity plan generated",
        "data": {
            "activity": [{"title": "Brisk Walking", "frequency": "30 min daily"}],
            "weekly_plan": {"intensity": "moderate"},
        },
    },
}

_GP_INPUT = AgentInput(
    prompt="What should I focus on this week?",
    task_type="gp",
    variables={
        "specialist_outputs": _SPECIALIST_OUTPUTS,
        "user_profile": {"age": 45, "weight_kg": 88},
    },
)


class GPAgentTest(unittest.TestCase):
    def test_llm_path_produces_patient_response(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.return_value = _LLM_RESPONSE

        agent = GPAgent(provider=mock_provider)
        result = agent.run(_GP_INPUT)

        self.assertEqual(result.status, "success")
        self.assertIn("patient_response", result.data)
        self.assertIn("action_plan", result.data)
        self.assertIn("urgent_flags", result.data)
        self.assertIn("conflict_resolutions", result.data)
        self.assertGreater(len(result.data["action_plan"]), 0)
        self.assertTrue(result.metadata.get("llm_generated"))
        mock_provider.generate.assert_called_once()

    def test_llm_failure_falls_back_to_rule_based(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.side_effect = RuntimeError("LLM error")

        agent = GPAgent(provider=mock_provider)
        result = agent.run(_GP_INPUT)

        self.assertEqual(result.status, "success")
        self.assertIn("patient_response", result.data)
        self.assertIn("action_plan", result.data)
        self.assertFalse(result.metadata.get("llm_generated"))

    def test_rule_based_when_no_provider(self) -> None:
        agent = GPAgent()
        result = agent.run(_GP_INPUT)

        self.assertEqual(result.status, "success")
        self.assertIn("patient_response", result.data)
        self.assertGreater(len(result.data["action_plan"]), 0)

    def test_rule_based_flags_urgent_risks(self) -> None:
        agent = GPAgent()
        result = agent.run(AgentInput(
            prompt="My labs came back",
            task_type="gp",
            variables={
                "specialist_outputs": {
                    "endocrinologist": {
                        "content": "Lab interpretation",
                        "data": {
                            "risks": {"diabetes_risk": True},
                            "lab_actions": ["Follow up with clinician."],
                            "clinical_narrative": "Elevated glucose detected.",
                            "dietary_constraints": ["avoid sugar"],
                        },
                    }
                },
                "user_profile": {},
            },
        ))
        self.assertGreater(len(result.data.get("urgent_flags", [])), 0)


if __name__ == "__main__":
    unittest.main()

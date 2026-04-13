from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.interface import AgentInput
from app.agents.lab_agent import LabInterpretationAgent

_LLM_RESPONSE = json.dumps({
    "lab_insights": [
        {"test_name": "HbA1c", "status": "high", "summary": "HbA1c is clearly above the expected range."}
    ],
    "risks": {
        "prediabetes_risk": False,
        "diabetes_risk": True,
        "liver_stress_risk": False,
        "gout_risk": False,
    },
    "lab_actions": ["Prioritize lower-sugar meals and follow up with a clinician."],
    "clinical_narrative": "Your HbA1c is elevated, indicating poor blood sugar control.",
    "dietary_constraints": ["avoid added sugar", "limit refined carbohydrates"],
})

_LAB_INPUT = AgentInput(
    prompt="Interpret my labs",
    task_type="lab",
    variables={
        "lab_records": [{"test_name": "HbA1c", "value": 7.5, "status": "high"}]
    },
)


class LabAgentLLMTest(unittest.TestCase):
    def test_uses_llm_when_provider_given(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.return_value = _LLM_RESPONSE

        agent = LabInterpretationAgent(provider=mock_provider)
        result = agent.run(_LAB_INPUT)

        self.assertEqual(result.status, "success")
        self.assertTrue(result.data["risks"]["diabetes_risk"])
        self.assertFalse(result.data["risks"]["prediabetes_risk"])
        self.assertIn(
            "Prioritize lower-sugar meals and follow up with a clinician.",
            result.data["lab_actions"],
        )
        self.assertIn("clinical_narrative", result.data)
        mock_provider.generate.assert_called_once()

    def test_falls_back_to_rules_when_llm_raises(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.side_effect = RuntimeError("LLM error")

        agent = LabInterpretationAgent(provider=mock_provider)
        result = agent.run(_LAB_INPUT)

        # Rule-based fallback should still produce a valid output
        self.assertEqual(result.status, "success")
        self.assertTrue(result.data["risks"]["diabetes_risk"])

    def test_rule_based_when_no_provider(self) -> None:
        agent = LabInterpretationAgent()
        result = agent.run(_LAB_INPUT)

        self.assertEqual(result.status, "success")
        self.assertTrue(result.data["risks"]["diabetes_risk"])


if __name__ == "__main__":
    unittest.main()

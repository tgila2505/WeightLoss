from __future__ import annotations

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.interface import AgentInput
from app.orchestrator.models import (
    AdherenceSignalContext,
    HealthMetricContext,
    LabRecordContext,
    OrchestrationContext,
    OrchestrationRequest,
    UserProfileContext,
)
from app.orchestrator.orchestrator import Orchestrator
from app.schemas.output import AIOutput


class SpyAgent:
    """Records the specialist_outputs it received so tests can inspect cascade order."""
    def __init__(self, name: str, output_data: dict | None = None) -> None:
        self.name = name
        self.received_specialist_outputs: dict = {}
        self.call_count = 0
        self._output_data = output_data or {}

    def run(self, request: AgentInput) -> AIOutput:
        self.received_specialist_outputs = dict(request.variables.get("specialist_outputs") or {})
        self.call_count += 1
        return AIOutput(
            content=f"{self.name} output",
            data=self._output_data,
            metadata={"agent_name": self.name},
        )


class CascadePipelineTest(unittest.TestCase):
    def _make_request(self) -> OrchestrationRequest:
        return OrchestrationRequest(
            context=OrchestrationContext(
                prompt="Build my plan",
                intent="weekly_plan",
                user_profile=UserProfileContext(user_id=42),
                health_metrics=[HealthMetricContext(weight_kg=85, steps=5000, sleep_hours=7.0)],
                lab_records=[LabRecordContext(test_name="HbA1c", value=6.2, unit="%", status="elevated")],
                adherence_signals=[AdherenceSignalContext(name="meal_plan_followed", completed=True)],
            )
        )

    def test_endocrinologist_receives_no_specialist_outputs(self) -> None:
        endo_spy = SpyAgent("endocrinologist", {"lab_insights": [], "risks": {}})
        meal_spy = SpyAgent("dietitian", {"meals": []})
        trainer_spy = SpyAgent("trainer", {"activity": [], "weekly_plan": {}})

        orchestrator = Orchestrator({
            "lab": endo_spy,
            "meal": meal_spy,
            "trainer": trainer_spy,
            "general": SpyAgent("general"),
        })
        orchestrator.handle(self._make_request())

        self.assertEqual(endo_spy.received_specialist_outputs, {})
        self.assertEqual(endo_spy.call_count, 1)

    def test_dietitian_receives_endocrinologist_output(self) -> None:
        endo_spy = SpyAgent("endocrinologist", {"lab_insights": [], "risks": {"diabetes_risk": True}})
        meal_spy = SpyAgent("dietitian", {"meals": []})
        trainer_spy = SpyAgent("trainer", {"activity": [], "weekly_plan": {}})

        orchestrator = Orchestrator({
            "lab": endo_spy,
            "meal": meal_spy,
            "trainer": trainer_spy,
            "general": SpyAgent("general"),
        })
        orchestrator.handle(self._make_request())

        self.assertIn("endocrinologist", meal_spy.received_specialist_outputs)
        self.assertNotIn("dietitian", meal_spy.received_specialist_outputs)

    def test_trainer_receives_endocrinologist_and_dietitian_outputs(self) -> None:
        endo_spy = SpyAgent("endocrinologist", {"lab_insights": [], "risks": {}})
        meal_spy = SpyAgent("dietitian", {"meals": [{"meal": "breakfast", "name": "Oatmeal"}]})
        trainer_spy = SpyAgent("trainer", {"activity": [], "weekly_plan": {}})

        orchestrator = Orchestrator({
            "lab": endo_spy,
            "meal": meal_spy,
            "trainer": trainer_spy,
            "general": SpyAgent("general"),
        })
        orchestrator.handle(self._make_request())

        self.assertIn("endocrinologist", trainer_spy.received_specialist_outputs)
        self.assertIn("dietitian", trainer_spy.received_specialist_outputs)

    def test_cascade_result_is_success(self) -> None:
        orchestrator = Orchestrator({
            "lab": SpyAgent("endocrinologist", {"lab_insights": [], "risks": {}}),
            "meal": SpyAgent("dietitian", {"meals": []}),
            "trainer": SpyAgent("trainer", {"activity": [], "weekly_plan": {}, "adherence_signals": []}),
            "general": SpyAgent("general"),
        })
        result = orchestrator.handle(self._make_request())
        self.assertEqual(result.status, "success")


if __name__ == "__main__":
    unittest.main()

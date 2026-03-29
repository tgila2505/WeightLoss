import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.interface import AgentInput
from app.orchestrator import (
    HealthMetricContext,
    LabRecordContext,
    OrchestrationContext,
    OrchestrationRequest,
    Orchestrator,
    UserProfileContext,
)
from app.schemas.output import AIOutput


class StubAgent:
    def __init__(self, content: str, data: dict | None = None) -> None:
        self._content = content
        self._data = data or {}

    def run(self, request: AgentInput) -> AIOutput:
        return AIOutput(
            content=f"{request.task_type}: {self._content}",
            data=self._data,
            metadata={"task_type": request.task_type},
        )


class OrchestratorTest(unittest.TestCase):
    def test_routes_and_merges_multiple_agents(self) -> None:
        orchestrator = Orchestrator(
            {
                "lab": StubAgent("lab output"),
                "meal": StubAgent("meal output"),
                "behavior": StubAgent("behavior output"),
                "general": StubAgent("general output"),
            }
        )

        request = OrchestrationRequest(
            context=OrchestrationContext(
                prompt="Summarize my latest labs and weight trend",
                intent="lab_summary",
                user_profile=UserProfileContext(),
                health_metrics=[HealthMetricContext(weight_kg=80, bmi=24.7)],
                lab_records=[LabRecordContext(test_name="ALT", value=70, unit="U/L")],
            )
        )

        response = orchestrator.handle(request)

        self.assertEqual(response.status, "success")
        self.assertEqual(response.metadata["primary_agent"], "lab")
        self.assertTrue(response.metadata["conflict_detected"])
        self.assertEqual(
            response.metadata["routed_agents"],
            ["lab", "meal", "behavior"],
        )

    def test_conflict_resolution_prefers_higher_priority_actions(self) -> None:
        orchestrator = Orchestrator(
            {
                "lab": StubAgent(
                    "lab output",
                    data={"lab_actions": ["Reduce sugar intake."]},
                ),
                "meal": StubAgent(
                    "meal output",
                    data={"behavioral_actions": ["Increase sugar intake for quick energy."]},
                ),
                "general": StubAgent("general output"),
            }
        )

        request = OrchestrationRequest(
            context=OrchestrationContext(
                prompt="Need help with glucose",
                intent="lab_summary",
                lab_records=[LabRecordContext(test_name="HbA1c", value=6.8, unit="%")],
            )
        )

        response = orchestrator.handle(request)

        self.assertTrue(response.metadata["conflict_detected"])
        self.assertIn("Reduce sugar intake.", response.data["lab_actions"])
        self.assertNotIn(
            "Increase sugar intake for quick energy.",
            response.metadata["final_plan"]["recommendations"],
        )

    def test_falls_back_to_general_for_legacy_agent_input(self) -> None:
        orchestrator = Orchestrator(StubAgent("general output"))

        response = orchestrator.handle(AgentInput(prompt="Hello"))

        self.assertEqual(response.content, "default: general output")


if __name__ == "__main__":
    unittest.main()

import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents import BehaviorAgent, LabInterpretationAgent, MealPlanAgent
from app.agents.interface import AgentInput
from app.orchestrator import (
    AdherenceSignalContext,
    HealthMetricContext,
    LabRecordContext,
    OrchestrationContext,
    OrchestrationRequest,
    Orchestrator,
    UserProfileContext,
)
from app.services.adherence_service import AdherenceService
from app.services.recommendation_service import RecommendationService
from app.vector.mock_vector_db import MockVectorDB


class DomainAgentsAndOrchestratorTest(unittest.TestCase):
    def test_meal_agent_applies_constraints_and_biomarkers(self) -> None:
        agent = MealPlanAgent()

        output = agent.run(
            AgentInput(
                prompt="Build meals",
                task_type="meal",
                variables={
                    "user_profile": {
                        "dietary_restrictions": ["vegan"],
                        "dietary_preferences": ["mediterranean"],
                    },
                    "lab_records": [{"test_name": "HbA1c", "status": "high"}],
                },
            )
        )

        self.assertEqual(output.data["meals"][0]["name"], "Tofu scramble with oats and berries")
        self.assertIn("lower_sugar", output.data["meal_biomarker_adjustments"])
        self.assertIn("vegan", output.data["meal_constraints_applied"])

    def test_lab_agent_generates_risks_and_actions(self) -> None:
        agent = LabInterpretationAgent()

        output = agent.run(
            AgentInput(
                prompt="Interpret labs",
                task_type="lab",
                variables={
                    "lab_records": [
                        {"test_name": "hba1c", "status": "high"},
                        {"test_name": "alt", "status": "elevated"},
                    ]
                },
            )
        )

        self.assertEqual(len(output.data["risks"]), 2)
        self.assertIn(
            "Prioritize lower-sugar meals and follow up with a clinician.",
            output.data["lab_actions"],
        )

    def test_orchestrator_generates_and_persists_final_plan(self) -> None:
        handle, db_path = tempfile.mkstemp(suffix=".sqlite3")
        os.close(handle)
        Path(db_path).unlink(missing_ok=True)
        vector_path = str(Path(db_path).with_suffix(".json"))
        recommendation_service = RecommendationService(db_path=db_path)
        adherence_service = AdherenceService(db_path=db_path)
        vector_store = MockVectorDB(storage_path=vector_path)
        orchestrator = Orchestrator(
            {
                "meal": MealPlanAgent(),
                "lab": LabInterpretationAgent(),
                "behavior": BehaviorAgent(),
                "general": MealPlanAgent(),
            },
            recommendation_service=recommendation_service,
            adherence_service=adherence_service,
            vector_store=vector_store,
        )

        request = OrchestrationRequest(
            context=OrchestrationContext(
                prompt="Create my plan",
                intent="weekly_plan",
                user_profile=UserProfileContext(
                    user_id=7,
                    dietary_restrictions=["vegetarian"],
                ),
                health_metrics=[
                    HealthMetricContext(
                        weight_kg=84,
                        bmi=27.0,
                        steps=5000,
                        sleep_hours=6.5,
                        weight_trend="increasing",
                    )
                ],
                lab_records=[
                    LabRecordContext(
                        test_name="hba1c",
                        value=6.8,
                        unit="%",
                        status="high",
                    )
                ],
                adherence_signals=[
                    AdherenceSignalContext(name="meal_plan_followed", completed=False)
                ],
            )
        )

        response = orchestrator.handle(request)

        self.assertEqual(response.status, "success")
        self.assertTrue(response.metadata["recommendation_id"] is not None)
        self.assertEqual(len(response.metadata["final_plan"]["meals"]), 3)
        self.assertEqual(len(response.metadata["final_plan"]["activity"]), 1)
        self.assertIn(
            "Prioritize lower-sugar meals and follow up with a clinician.",
            response.metadata["final_plan"]["recommendations"],
        )
        stored = recommendation_service.list_recommendations(user_id=7)
        self.assertEqual(len(stored), 1)
        vector_hits = vector_store.search("recommendations", "plan", limit=5)
        self.assertEqual(len(vector_hits), 1)
        reloaded_vector_store = MockVectorDB(storage_path=vector_path)
        reloaded_hits = reloaded_vector_store.search("recommendations", "plan", limit=5)
        self.assertEqual(len(reloaded_hits), 1)

        second_response = orchestrator.handle(request)
        self.assertEqual(
            second_response.metadata["retrieved_recommendations"][0]["metadata"]["user_id"],
            7,
        )
        self.assertTrue(second_response.metadata["recommendation_id"] is not None)


if __name__ == "__main__":
    unittest.main()

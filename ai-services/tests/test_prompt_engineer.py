from __future__ import annotations

import gc
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import MagicMock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.agents.prompt_engineer_agent import PromptEngineerAgent
from app.services.prompt_audit_service import PromptAuditService
from app.services.recommendation_service import RecommendationService


def _unlink(path: str) -> None:
    """Delete a temp SQLite file, suppressing Windows lock errors."""
    gc.collect()
    try:
        Path(path).unlink(missing_ok=True)
    except PermissionError:
        pass  # Windows may keep a handle; file will be cleaned up by OS


class PromptAuditServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        handle, self.db_path = tempfile.mkstemp(suffix=".sqlite3")
        os.close(handle)
        _unlink(self.db_path)
        self.svc = RecommendationService(db_path=self.db_path)
        for i in range(3):
            self.svc.store_recommendation(
                user_id=1,
                intent="weekly_plan",
                content=f"Sample recommendation {i}",
                data={"meals": [], "agent": "meal"},
            )
        self.audit_svc = PromptAuditService(recommendation_service=self.svc)

    def tearDown(self) -> None:
        _unlink(self.db_path)

    def test_sample_returns_up_to_n_records(self) -> None:
        samples = self.audit_svc.sample_recent(agent_name="meal", n=2)
        self.assertLessEqual(len(samples), 2)

    def test_sample_returns_all_when_fewer_than_n(self) -> None:
        samples = self.audit_svc.sample_recent(agent_name="meal", n=10)
        self.assertGreater(len(samples), 0)

    def test_sample_filters_by_agent_name(self) -> None:
        # Store an extra record tagged as "gp"
        self.svc.store_recommendation(
            user_id=1,
            intent="weekly_plan",
            content="GP recommendation",
            data={"agent": "gp"},
        )
        meal_samples = self.audit_svc.sample_recent(agent_name="meal", n=10)
        gp_samples = self.audit_svc.sample_recent(agent_name="gp", n=10)

        # meal samples must not contain the gp record
        self.assertTrue(all(s["data"].get("agent") == "meal" for s in meal_samples))
        # gp samples must not contain meal records
        self.assertTrue(all(s["data"].get("agent") == "gp" for s in gp_samples))
        self.assertEqual(len(gp_samples), 1)


class PromptEngineerAgentTest(unittest.TestCase):
    def setUp(self) -> None:
        handle, self.db_path = tempfile.mkstemp(suffix=".sqlite3")
        os.close(handle)
        _unlink(self.db_path)
        self.svc = RecommendationService(db_path=self.db_path)
        self.audit_svc = PromptAuditService(recommendation_service=self.svc)

    def tearDown(self) -> None:
        _unlink(self.db_path)

    def test_audit_returns_report_structure(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.return_value = json.dumps({
            "score": 7,
            "critique": "Agent is verbose. Prompt can be shortened by 20%.",
            "proposed_prompt": "Shorter version of the prompt here.",
        })

        self.svc.store_recommendation(
            user_id=1,
            intent="weekly_plan",
            content="Sample",
            data={"meals": [], "agent": "meal"},
        )

        agent = PromptEngineerAgent(provider=mock_provider, audit_service=self.audit_svc)
        report = agent.run(agent_filter=["meal"])

        self.assertIn("meal", report)
        self.assertIn("score", report["meal"])
        self.assertIn("critique", report["meal"])
        self.assertIn("proposed_prompt", report["meal"])
        mock_provider.generate.assert_called()

    def test_audit_skips_agent_with_no_samples(self) -> None:
        mock_provider = MagicMock()
        agent = PromptEngineerAgent(provider=mock_provider, audit_service=self.audit_svc)

        report = agent.run(agent_filter=["meal"])
        self.assertEqual(report.get("meal", {}).get("status"), "skipped")
        mock_provider.generate.assert_not_called()


if __name__ == "__main__":
    unittest.main()

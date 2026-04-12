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

from app.services.prompt_audit_service import PromptAuditService
from app.agents.prompt_engineer_agent import PromptEngineerAgent
from app.services.recommendation_service import RecommendationService


class PromptAuditServiceTest(unittest.TestCase):
    def _make_db_with_samples(self) -> tuple[str, RecommendationService]:
        handle, db_path = tempfile.mkstemp(suffix=".sqlite3")
        os.close(handle)
        gc.collect()
        try:
            Path(db_path).unlink(missing_ok=True)
        except PermissionError:
            pass  # Windows may keep a handle; file will be cleaned up by OS
        svc = RecommendationService(db_path=db_path)
        for i in range(3):
            svc.store_recommendation(
                user_id=1,
                intent="weekly_plan",
                content=f"Sample recommendation {i}",
                data={"meals": [], "agent": "meal"},
            )
        return db_path, svc

    def test_sample_returns_up_to_n_records(self) -> None:
        db_path, svc = self._make_db_with_samples()
        audit_svc = PromptAuditService(recommendation_service=svc)
        samples = audit_svc.sample_recent(agent_name="meal", n=2)
        self.assertLessEqual(len(samples), 2)
        gc.collect()
        try:
            Path(db_path).unlink(missing_ok=True)
        except PermissionError:
            pass  # Windows may keep a handle; file will be cleaned up by OS

    def test_sample_returns_all_when_fewer_than_n(self) -> None:
        db_path, svc = self._make_db_with_samples()
        audit_svc = PromptAuditService(recommendation_service=svc)
        samples = audit_svc.sample_recent(agent_name="meal", n=10)
        self.assertGreater(len(samples), 0)
        gc.collect()
        try:
            Path(db_path).unlink(missing_ok=True)
        except PermissionError:
            pass  # Windows may keep a handle; file will be cleaned up by OS


class PromptEngineerAgentTest(unittest.TestCase):
    def test_audit_returns_report_structure(self) -> None:
        mock_provider = MagicMock()
        mock_provider.generate.return_value = json.dumps({
            "score": 7,
            "critique": "Agent is verbose. Prompt can be shortened by 20%.",
            "proposed_prompt": "Shorter version of the prompt here.",
        })

        handle, db_path = tempfile.mkstemp(suffix=".sqlite3")
        os.close(handle)
        gc.collect()
        try:
            Path(db_path).unlink(missing_ok=True)
        except PermissionError:
            pass  # Windows may keep a handle; file will be cleaned up by OS
        svc = RecommendationService(db_path=db_path)
        svc.store_recommendation(user_id=1, intent="weekly_plan", content="Sample", data={"meals": [], "agent": "meal"})

        audit_svc = PromptAuditService(recommendation_service=svc)
        agent = PromptEngineerAgent(provider=mock_provider, audit_service=audit_svc)
        report = agent.run(agent_filter=["meal"])

        self.assertIn("meal", report)
        self.assertIn("score", report["meal"])
        self.assertIn("critique", report["meal"])
        self.assertIn("proposed_prompt", report["meal"])
        mock_provider.generate.assert_called()
        gc.collect()
        try:
            Path(db_path).unlink(missing_ok=True)
        except PermissionError:
            pass  # Windows may keep a handle; file will be cleaned up by OS

    def test_audit_skips_agent_with_no_samples(self) -> None:
        mock_provider = MagicMock()

        handle, db_path = tempfile.mkstemp(suffix=".sqlite3")
        os.close(handle)
        gc.collect()
        try:
            Path(db_path).unlink(missing_ok=True)
        except PermissionError:
            pass  # Windows may keep a handle; file will be cleaned up by OS
        svc = RecommendationService(db_path=db_path)
        audit_svc = PromptAuditService(recommendation_service=svc)
        agent = PromptEngineerAgent(provider=mock_provider, audit_service=audit_svc)

        report = agent.run(agent_filter=["meal"])
        self.assertEqual(report.get("meal", {}).get("status"), "skipped")
        mock_provider.generate.assert_not_called()
        gc.collect()
        try:
            Path(db_path).unlink(missing_ok=True)
        except PermissionError:
            pass  # Windows may keep a handle; file will be cleaned up by OS


if __name__ == "__main__":
    unittest.main()

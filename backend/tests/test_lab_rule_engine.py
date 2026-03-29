import sys
import unittest
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.lab import LabRecord
from app.services.lab_rule_engine import LabRuleEngine


class LabRuleEngineTest(unittest.TestCase):
    def setUp(self) -> None:
        self.engine = LabRuleEngine()

    def _record(self, test_name: str, value: str) -> LabRecord:
        return LabRecord(
            id=1,
            user_id=1,
            test_name=test_name,
            value=Decimal(value),
            unit=None,
            reference_range=None,
            recorded_date=date(2026, 1, 1),
            created_at=datetime(2026, 1, 1),
            updated_at=datetime(2026, 1, 1),
        )

    def test_hba1c_high(self) -> None:
        evaluation = self.engine.evaluate(self._record("HbA1c", "6.8"))

        self.assertEqual(evaluation.normalized_test_name, "hba1c")
        self.assertEqual(evaluation.status, "high")
        self.assertTrue(evaluation.is_abnormal)
        self.assertTrue(evaluation.rule_applied)

    def test_alt_elevated(self) -> None:
        evaluation = self.engine.evaluate(self._record("ALT", "80"))

        self.assertEqual(evaluation.normalized_test_name, "alt")
        self.assertEqual(evaluation.status, "elevated")
        self.assertTrue(evaluation.is_abnormal)
        self.assertTrue(evaluation.rule_applied)

    def test_uric_acid_normal(self) -> None:
        evaluation = self.engine.evaluate(self._record("Uric Acid", "6.2"))

        self.assertEqual(evaluation.normalized_test_name, "uric_acid")
        self.assertEqual(evaluation.status, "normal")
        self.assertFalse(evaluation.is_abnormal)
        self.assertTrue(evaluation.rule_applied)

    def test_unknown_rule(self) -> None:
        evaluation = self.engine.evaluate(self._record("Creatinine", "1.1"))

        self.assertIsNone(evaluation.normalized_test_name)
        self.assertEqual(evaluation.status, "unknown")
        self.assertFalse(evaluation.is_abnormal)
        self.assertFalse(evaluation.rule_applied)

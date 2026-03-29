import sys
import unittest
from datetime import date, datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.adherence import AdherenceRecord
from app.services.adaptive_service import AdaptiveService


class AdaptiveServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.service = AdaptiveService()

    def _record(self, record_id: int, completed: bool) -> AdherenceRecord:
        return AdherenceRecord(
            id=record_id,
            user_id=1,
            item_type="meal",
            item_name=f"Item {record_id}",
            completed=completed,
            adherence_date=date(2026, 3, 29),
            score=100 if completed else 0,
            created_at=datetime(2026, 3, 29, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 29, tzinfo=timezone.utc),
        )

    def test_build_summary_returns_high_consistency_adjustments(self) -> None:
        summary = self.service.build_summary(
            [
                self._record(1, True),
                self._record(2, True),
                self._record(3, False),
                self._record(4, True),
                self._record(5, True),
            ]
        )

        self.assertEqual(summary.adherence_score, 0.8)
        self.assertEqual(summary.consistency_level, "high")
        self.assertEqual(summary.adjustments.meal_adjustment, "maintain_current_meals")

    def test_build_summary_returns_low_consistency_adjustments(self) -> None:
        summary = self.service.build_summary(
            [
                self._record(1, False),
                self._record(2, False),
                self._record(3, True),
            ]
        )

        self.assertEqual(summary.adherence_score, 0.33)
        self.assertEqual(summary.consistency_level, "low")
        self.assertEqual(summary.adjustments.activity_adjustment, "reduce_activity_intensity")


if __name__ == "__main__":
    unittest.main()

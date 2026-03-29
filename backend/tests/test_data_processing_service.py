import sys
import unittest
from datetime import date, datetime, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.health_metrics import HealthMetrics
from app.models.lab import LabRecord
from app.services.data_processing_service import DataProcessingService


class DataProcessingServiceTest(unittest.TestCase):
    def setUp(self) -> None:
        self.service = DataProcessingService()

    def test_computes_bmi(self) -> None:
        bmi = self.service.compute_bmi(weight_kg=80, height_cm=180)

        self.assertEqual(bmi, 24.69)

    def test_normalizes_uric_acid_from_umol(self) -> None:
        normalized = self.service.normalize_lab_record(
            test_name="Uric Acid",
            value=360,
            unit="umol/L",
            reference_range="200-420",
        )

        self.assertEqual(normalized.value, 6.05)
        self.assertEqual(normalized.unit, "mg/dL")

    def test_health_metric_trend_is_decreasing(self) -> None:
        current = HealthMetrics(
            id=2,
            user_id=1,
            weight_kg=Decimal("79.0"),
            bmi=Decimal("24.38"),
            steps=9000,
            sleep_hours=Decimal("7.5"),
            height_cm=Decimal("180.0"),
            recorded_at=datetime(2026, 3, 2, tzinfo=timezone.utc),
            created_at=datetime(2026, 3, 2, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 2, tzinfo=timezone.utc),
        )
        previous = HealthMetrics(
            id=1,
            user_id=1,
            weight_kg=Decimal("80.0"),
            bmi=Decimal("24.69"),
            steps=8500,
            sleep_hours=Decimal("7.0"),
            height_cm=Decimal("180.0"),
            recorded_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
            created_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
        )

        processed = self.service.build_health_metric_processed(current, previous)

        self.assertEqual(processed["weight_trend"], "decreasing")
        self.assertEqual(processed["bmi_trend"], "decreasing")

    def test_lab_trend_is_increasing(self) -> None:
        current = LabRecord(
            id=2,
            user_id=1,
            test_name="ALT",
            value=Decimal("70.0"),
            unit="U/L",
            reference_range="0-55",
            recorded_date=date(2026, 3, 2),
            created_at=datetime(2026, 3, 2, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 2, tzinfo=timezone.utc),
        )
        previous = LabRecord(
            id=1,
            user_id=1,
            test_name="ALT",
            value=Decimal("55.0"),
            unit="U/L",
            reference_range="0-55",
            recorded_date=date(2026, 3, 1),
            created_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
            updated_at=datetime(2026, 3, 1, tzinfo=timezone.utc),
        )

        processed = self.service.build_lab_processed(current, previous)

        self.assertEqual(processed["normalized_value"], 70.0)
        self.assertEqual(processed["normalized_unit"], "U/L")
        self.assertEqual(processed["trend"], "increasing")

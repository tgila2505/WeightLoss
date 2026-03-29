from dataclasses import dataclass
from decimal import Decimal

from app.models.health_metrics import HealthMetrics
from app.models.lab import LabRecord


@dataclass(frozen=True)
class NormalizedLabInput:
    test_name: str
    value: float
    unit: str | None
    reference_range: str | None


class DataProcessingService:
    _TREND_EPSILON = 0.01
    _LAB_UNIT_ALIASES = {
        "%": "%",
        "percent": "%",
        "u/l": "U/L",
        "iu/l": "U/L",
        "units/l": "U/L",
        "mg/dl": "mg/dL",
        "mmol/l": "mmol/L",
        "umol/l": "umol/L",
        "µmol/l": "umol/L",
    }

    def normalize_lab_record(
        self,
        test_name: str,
        value: float,
        unit: str | None,
        reference_range: str | None,
    ) -> NormalizedLabInput:
        normalized_name = self._normalize_test_name(test_name)
        normalized_unit = self._normalize_unit(unit)
        normalized_value = float(value)

        if normalized_name == "hba1c":
            if normalized_unit == "mmol/L":
                normalized_value = round((normalized_value + 2.15) / 10.929, 2)
                normalized_unit = "%"
            elif normalized_unit is None:
                normalized_unit = "%"
        elif normalized_name == "alt":
            if normalized_unit is None:
                normalized_unit = "U/L"
        elif normalized_name == "uric acid":
            if normalized_unit == "mmol/L":
                normalized_value = round(normalized_value / 0.05948, 2)
                normalized_unit = "mg/dL"
            elif normalized_unit == "umol/L":
                normalized_value = round(normalized_value / 59.48, 2)
                normalized_unit = "mg/dL"
            elif normalized_unit is None:
                normalized_unit = "mg/dL"

        return NormalizedLabInput(
            test_name=test_name.strip(),
            value=normalized_value,
            unit=normalized_unit,
            reference_range=reference_range,
        )

    def compute_bmi(
        self,
        weight_kg: float | Decimal | None,
        height_cm: float | Decimal | None,
    ) -> float | None:
        if weight_kg is None or height_cm is None:
            return None

        height_m = float(height_cm) / 100
        if height_m <= 0:
            return None

        return round(float(weight_kg) / (height_m * height_m), 2)

    def compute_trend(
        self,
        current_value: float | Decimal | None,
        previous_value: float | Decimal | None,
    ) -> str:
        if current_value is None or previous_value is None:
            return "no_data"

        delta = float(current_value) - float(previous_value)
        if abs(delta) <= self._TREND_EPSILON:
            return "stable"
        if delta > 0:
            return "increasing"
        return "decreasing"

    def build_health_metric_processed(
        self,
        metric: HealthMetrics,
        previous_metric: HealthMetrics | None,
    ) -> dict[str, object]:
        derived_bmi = self.compute_bmi(metric.weight_kg, metric.height_cm)
        current_bmi = metric.bmi if metric.bmi is not None else derived_bmi
        previous_bmi = None
        if previous_metric is not None:
            previous_bmi = (
                previous_metric.bmi
                if previous_metric.bmi is not None
                else self.compute_bmi(previous_metric.weight_kg, previous_metric.height_cm)
            )

        return {
            "weight_unit": "kg",
            "height_unit": "cm" if metric.height_cm is not None else None,
            "sleep_unit": "hours" if metric.sleep_hours is not None else None,
            "derived_bmi": derived_bmi,
            "weight_trend": self.compute_trend(
                metric.weight_kg,
                previous_metric.weight_kg if previous_metric is not None else None,
            ),
            "bmi_trend": self.compute_trend(current_bmi, previous_bmi),
        }

    def build_lab_processed(
        self,
        record: LabRecord,
        previous_record: LabRecord | None,
    ) -> dict[str, object]:
        return {
            "normalized_value": float(record.value),
            "normalized_unit": record.unit,
            "trend": self.compute_trend(
                record.value,
                previous_record.value if previous_record is not None else None,
            ),
        }

    def _normalize_test_name(self, test_name: str) -> str:
        return " ".join(test_name.strip().lower().split())

    def _normalize_unit(self, unit: str | None) -> str | None:
        if unit is None:
            return None
        normalized = unit.strip().lower()
        return self._LAB_UNIT_ALIASES.get(normalized, unit.strip())

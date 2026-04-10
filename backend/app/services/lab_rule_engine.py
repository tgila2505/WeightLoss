from dataclasses import dataclass
import re

from app.models.lab import LabRecord
from app.schemas.lab import LabEvaluation


@dataclass(frozen=True)
class ThresholdRule:
    normalized_test_name: str
    normal_max: float
    elevated_max: float


class LabRuleEngine:
    _ALIASES = {
        "hba1c": "hba1c",
        "hb a1c": "hba1c",
        "hemoglobin a1c": "hba1c",
        "alt": "alt",
        "alanine aminotransferase": "alt",
        "uric acid": "uric_acid",
        "urate": "uric_acid",
    }
    _RULES = {
        "hba1c": ThresholdRule(
            normalized_test_name="hba1c",
            normal_max=5.6,
            elevated_max=6.4,
        ),
        "alt": ThresholdRule(
            normalized_test_name="alt",
            normal_max=55.0,
            elevated_max=100.0,
        ),
        "uric_acid": ThresholdRule(
            normalized_test_name="uric_acid",
            normal_max=7.0,
            elevated_max=9.0,
        ),
    }

    def evaluate(self, record: LabRecord) -> LabEvaluation:
        normalized_test_name = self._normalize_test_name(record.test_name)
        rule = self._RULES.get(normalized_test_name)
        if rule is None:
            range_evaluation = self._evaluate_reference_range(record)
            if range_evaluation is not None:
                return range_evaluation

            return LabEvaluation(
                normalized_test_name=normalized_test_name,
                status="unknown",
                is_abnormal=False,
                rule_applied=False,
            )

        value = float(record.value)
        if value <= rule.normal_max:
            status = "normal"
        elif value <= rule.elevated_max:
            status = "elevated"
        else:
            status = "high"

        return LabEvaluation(
            normalized_test_name=rule.normalized_test_name,
            status=status,
            is_abnormal=status != "normal",
            rule_applied=True,
        )

    def _normalize_test_name(self, test_name: str) -> str | None:
        normalized = " ".join(test_name.strip().lower().split())
        return self._ALIASES.get(normalized)

    def _evaluate_reference_range(self, record: LabRecord) -> LabEvaluation | None:
        reference_range = (record.reference_range or "").strip().lower()
        if not reference_range:
            return None

        numbers = [float(match) for match in re.findall(r"-?\d+(?:\.\d+)?", reference_range)]
        value = float(record.value)

        if reference_range.startswith(">=") and len(numbers) >= 1:
            is_normal = value >= numbers[0]
        elif reference_range.startswith("<=") and len(numbers) >= 1:
            is_normal = value <= numbers[0]
        elif reference_range.startswith(">") and len(numbers) >= 1:
            is_normal = value > numbers[0]
        elif reference_range.startswith("<") and len(numbers) >= 1:
            is_normal = value < numbers[0]
        elif len(numbers) >= 2:
            low, high = numbers[0], numbers[1]
            is_normal = low <= value <= high
        else:
            return None

        return LabEvaluation(
            normalized_test_name=normalized_test_name if (normalized_test_name := self._normalize_test_name(record.test_name)) else None,
            status="normal" if is_normal else "abnormal",
            is_abnormal=not is_normal,
            rule_applied=True,
        )

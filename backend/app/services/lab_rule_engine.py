from dataclasses import dataclass

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

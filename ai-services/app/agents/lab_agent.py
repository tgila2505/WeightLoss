from __future__ import annotations

from app.agents.interface import AgentInput, AgentInterface
from app.schemas.output import AIOutput


class LabInterpretationAgent(AgentInterface):
    _RISK_MAP = {
        "hba1c": {
            "elevated": ("prediabetes_risk", "Moderate glucose regulation risk"),
            "high": ("diabetes_risk", "High glucose regulation risk"),
        },
        "alt": {
            "elevated": ("liver_stress_risk", "Possible liver strain"),
            "high": ("liver_stress_risk", "Elevated liver-related risk"),
        },
        "uric acid": {
            "elevated": ("gout_risk", "Higher uric acid burden"),
            "high": ("gout_risk", "High uric acid burden"),
        },
    }
    _ACTION_MAP = {
        "prediabetes_risk": "Reduce added sugar intake and keep meals high in fiber.",
        "diabetes_risk": "Prioritize lower-sugar meals and follow up with a clinician.",
        "liver_stress_risk": "Limit alcohol and saturated fat intake.",
        "gout_risk": "Hydrate well and reduce high-purine foods.",
    }

    def run(self, request: AgentInput) -> AIOutput:
        lab_records = request.variables.get("lab_records") or []
        insights: list[dict[str, str]] = []
        risks: list[dict[str, str]] = []
        actions: list[str] = []

        for record in lab_records:
            test_name = str(record.get("test_name", ""))
            normalized_name = test_name.lower()
            status = str(record.get("status", "unknown")).lower()
            insights.append(
                {
                    "test_name": test_name,
                    "status": status,
                    "summary": self._insight_summary(test_name, status),
                }
            )

            risk_info = self._RISK_MAP.get(normalized_name, {}).get(status)
            if risk_info is not None:
                risk_code, description = risk_info
                risk = {"code": risk_code, "description": description, "status": status}
                if risk not in risks:
                    risks.append(risk)
                action = self._ACTION_MAP[risk_code]
                if action not in actions:
                    actions.append(action)

        return AIOutput(
            content="Lab interpretation generated",
            data={
                "lab_insights": insights,
                "risks": risks,
                "lab_actions": actions,
            },
            metadata={"agent_name": "lab"},
        )

    def _insight_summary(self, test_name: str, status: str) -> str:
        if status == "normal":
            return f"{test_name} is within the expected range."
        if status == "elevated":
            return f"{test_name} is mildly above the expected range."
        if status == "high":
            return f"{test_name} is clearly above the expected range."
        return f"{test_name} does not have a mapped interpretation."

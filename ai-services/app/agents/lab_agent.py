from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from app.agents.interface import AgentInput, AgentInterface
from app.providers.base import LLMProvider
from app.schemas.output import AIOutput

_logger = logging.getLogger(__name__)
_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


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

    def __init__(self, provider: LLMProvider | None = None) -> None:
        self._provider = provider
        self._system_prompt: str | None = None

    def _get_system_prompt(self) -> str:
        if self._system_prompt is None:
            self._system_prompt = (
                _PROMPTS_DIR / "endocrinologist_system_prompt.txt"
            ).read_text(encoding="utf-8")
        return self._system_prompt

    def run(self, request: AgentInput) -> AIOutput:
        lab_records = request.variables.get("lab_records") or []

        if self._provider is not None:
            llm_result = self._run_with_llm(request, lab_records)
            if llm_result is not None:
                return llm_result

        return self._run_rule_based(lab_records)

    def _run_with_llm(
        self, request: AgentInput, lab_records: list[dict[str, Any]]
    ) -> AIOutput | None:
        records_text = json.dumps(lab_records, indent=2)
        prompt = (
            f"{self._get_system_prompt()}\n\n"
            f"PATIENT LAB RECORDS:\n{records_text}\n\n"
            f"PATIENT QUERY: {request.prompt}"
        )
        try:
            provider = self._provider
            raw = provider.generate(prompt)
            data = self._parse_json(raw)
            return AIOutput(
                content="Lab interpretation generated",
                data={
                    "lab_insights": data.get("lab_insights", []),
                    "risks": data.get("risks", {}),
                    "lab_actions": data.get("lab_actions", []),
                    "clinical_narrative": data.get("clinical_narrative", ""),
                    "dietary_constraints": data.get("dietary_constraints", []),
                },
                metadata={"agent_name": "endocrinologist", "llm_generated": True},
            )
        except Exception as exc:
            _logger.error("LabInterpretationAgent LLM call failed: %s", exc, exc_info=True)
            return None

    def _run_rule_based(self, lab_records: list[dict[str, Any]]) -> AIOutput:
        insights: list[dict[str, str]] = []
        risks: dict[str, bool] = {
            "prediabetes_risk": False,
            "diabetes_risk": False,
            "liver_stress_risk": False,
            "gout_risk": False,
        }
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
                risk_code, _ = risk_info
                risks[risk_code] = True
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
            metadata={"agent_name": "endocrinologist"},
        )

    def _parse_json(self, raw: str) -> dict[str, Any]:
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in LLM response")
        return json.loads(match.group())

    def _insight_summary(self, test_name: str, status: str) -> str:
        if status == "normal":
            return f"{test_name} is within the expected range."
        if status == "elevated":
            return f"{test_name} is mildly above the expected range."
        if status == "high":
            return f"{test_name} is clearly above the expected range."
        return f"{test_name} does not have a mapped interpretation."

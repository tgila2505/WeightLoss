from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from app.agents.interface import AgentInput, AgentInterface
from app.providers.base import LLMProvider
from app.schemas.output import AIOutput
from app.utils.json_utils import parse_json

_logger = logging.getLogger(__name__)
_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class GPAgent(AgentInterface):
    def __init__(self, provider: LLMProvider | None = None) -> None:
        self._provider = provider
        self._system_prompt: str | None = None

    def build_chat_prompt(self, user_prompt: str, specialist_outputs: dict) -> str:
        """Build the full LLM prompt string for a chat turn, including specialist panel context."""
        return self._build_prompt(user_prompt, specialist_outputs)

    def _get_system_prompt(self) -> str:
        if self._system_prompt is None:
            self._system_prompt = (
                _PROMPTS_DIR / "gp_system_prompt.txt"
            ).read_text(encoding="utf-8")
        return self._system_prompt

    def run(self, request: AgentInput) -> AIOutput:
        specialist_outputs = request.variables.get("specialist_outputs") or {}

        if self._provider is not None:
            llm_result = self._run_with_llm(request, specialist_outputs)
            if llm_result is not None:
                return llm_result

        return self._run_rule_based(request.prompt, specialist_outputs)

    def _run_with_llm(
        self,
        request: AgentInput,
        specialist_outputs: dict[str, Any],
    ) -> AIOutput | None:
        prompt = self._build_prompt(request.prompt, specialist_outputs)
        try:
            provider = self._provider
            raw = provider.generate(prompt)  # type: ignore[union-attr]
            data = parse_json(raw)
            if not data.get("patient_response"):
                return None
            return AIOutput(
                content=data["patient_response"],
                data={
                    "patient_response": data["patient_response"],
                    "action_plan": data.get("action_plan", []),
                    "urgent_flags": data.get("urgent_flags", []),
                    "conflict_resolutions": data.get("conflict_resolutions", []),
                    "motivation_note": data.get("motivation_note", ""),
                },
                metadata={"agent_name": "gp", "llm_generated": True},
            )
        except Exception as exc:
            _logger.error("GPAgent LLM call failed: %s", exc, exc_info=True)
            return None

    def _build_prompt(
        self,
        user_prompt: str,
        specialist_outputs: dict[str, Any],
    ) -> str:
        endo = self._extract_specialist_data(specialist_outputs, "endocrinologist")
        dietitian = self._extract_specialist_data(specialist_outputs, "dietitian")
        trainer = self._extract_specialist_data(specialist_outputs, "trainer")

        context = json.dumps({
            "endocrinologist": {
                "risks": endo.get("risks", {}),
                "clinical_narrative": endo.get("clinical_narrative", ""),
                "lab_actions": endo.get("lab_actions", []),
                "dietary_constraints": endo.get("dietary_constraints", []),
            },
            "dietitian": {
                "meals": dietitian.get("meals", []),
                "biomarker_adjustments": dietitian.get("meal_biomarker_adjustments", []),
            },
            "trainer": {
                "activity": trainer.get("activity", []),
                "weekly_plan": trainer.get("weekly_plan", {}),
            },
        }, indent=2)

        return (
            f"{self._get_system_prompt()}\n\n"
            f"PATIENT QUESTION: \"{user_prompt}\"\n\n"
            f"SPECIALIST PANEL FINDINGS:\n{context}"
        )

    def _run_rule_based(
        self,
        user_prompt: str,
        specialist_outputs: dict[str, Any],
    ) -> AIOutput:
        endo = self._extract_specialist_data(specialist_outputs, "endocrinologist")
        dietitian = self._extract_specialist_data(specialist_outputs, "dietitian")
        trainer = self._extract_specialist_data(specialist_outputs, "trainer")

        endo_risks = endo.get("risks", {})
        lab_actions = endo.get("lab_actions", [])
        meal_count = len(dietitian.get("meals", []))
        activity = trainer.get("activity", [])
        weekly_plan = trainer.get("weekly_plan", {})

        # Build patient response narrative
        narrative_parts: list[str] = ["Based on your health data, here is your personalised weekly plan."]
        if endo.get("clinical_narrative"):
            narrative_parts.append(endo["clinical_narrative"])
        if meal_count:
            narrative_parts.append(f"Your Dietitian has prepared {meal_count} meals tailored to your profile.")
        if activity:
            intensity = weekly_plan.get("intensity", "moderate")
            narrative_parts.append(
                f"Your Personal Trainer recommends {len(activity)} activity type(s) at {intensity} intensity."
            )
        patient_response = " ".join(narrative_parts)

        # Build action plan
        action_plan: list[str] = list(lab_actions)
        constraints = endo.get("dietary_constraints", [])
        for c in constraints[:2]:
            action_plan.append(f"Diet: {c}")
        for act in activity[:2]:
            action_plan.append(f"Activity: {act.get('title', 'Activity')} — {act.get('frequency', '')}")
        action_plan.append("Log your meals and activity daily to track progress.")

        # Urgent flags
        urgent_flags: list[str] = []
        if isinstance(endo_risks, dict) and endo_risks.get("diabetes_risk"):
            urgent_flags.append(
                "Elevated diabetes risk detected — please schedule a follow-up with your physician."
            )
        if isinstance(endo_risks, dict) and endo_risks.get("liver_stress_risk"):
            urgent_flags.append(
                "Liver stress marker elevated — limit alcohol and saturated fat, and follow up with your doctor."
            )

        return AIOutput(
            content=patient_response,
            data={
                "patient_response": patient_response,
                "action_plan": action_plan,
                "urgent_flags": urgent_flags,
                "conflict_resolutions": [],
                "motivation_note": "Every consistent day compounds — you are building real habits.",
            },
            metadata={"agent_name": "gp"},
        )

    @staticmethod
    def _extract_specialist_data(specialist_outputs: dict[str, Any], key: str) -> dict[str, Any]:
        """Extract the data dict for a given specialist from specialist_outputs."""
        item = specialist_outputs.get(key, {})
        return item.get("data", {}) if isinstance(item, dict) else {}


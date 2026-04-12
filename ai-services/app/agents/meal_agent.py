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


class MealPlanAgent(AgentInterface):
    def __init__(self, provider: LLMProvider | None = None) -> None:
        self._provider = provider
        self._system_prompt: str | None = None

    def run(self, request: AgentInput) -> AIOutput:
        profile = request.variables.get("user_profile") or {}
        lab_records = request.variables.get("lab_records") or []
        restrictions = {item.lower() for item in profile.get("dietary_restrictions", [])}
        preferences = {item.lower() for item in profile.get("dietary_preferences", [])}
        biomarker_flags = self._biomarker_flags(lab_records)

        specialist_outputs = request.variables.get("specialist_outputs") or {}

        if self._provider is not None:
            llm_result = self._run_with_llm(request, profile, restrictions, preferences, biomarker_flags, specialist_outputs)
            if llm_result is not None:
                return llm_result

        meals = [
            {"meal": "breakfast", "name": self._choose_breakfast(restrictions, biomarker_flags)},
            {"meal": "lunch", "name": self._choose_lunch(restrictions, preferences, biomarker_flags)},
            {"meal": "dinner", "name": self._choose_dinner(restrictions, biomarker_flags)},
        ]
        return AIOutput(
            content="Meal plan generated",
            data={
                "meals": meals,
                "meal_constraints_applied": sorted(restrictions | preferences),
                "meal_biomarker_adjustments": biomarker_flags,
            },
            metadata={"agent_name": "meal"},
        )

    def _run_with_llm(
        self,
        request: AgentInput,
        profile: dict[str, Any],
        restrictions: set[str],
        preferences: set[str],
        biomarker_flags: list[str],
        specialist_outputs: dict[str, Any] | None = None,
    ) -> AIOutput | None:
        prompt = self._build_prompt(request.prompt, profile, restrictions, preferences, biomarker_flags, specialist_outputs or {})
        try:
            provider = self._provider
            raw = provider.generate(prompt)  # type: ignore[union-attr]
            data = self._parse_json(raw)
            meals = [self._normalize_meal(m) for m in data.get("meals", [])]
            meals = [m for m in meals if m.get("meal") and m.get("name")]
            if not meals:
                return None
            return AIOutput(
                content="Meal plan generated",
                data={
                    "meals": meals,
                    "meal_constraints_applied": data.get("constraints_applied", sorted(restrictions | preferences)),
                    "meal_biomarker_adjustments": data.get("biomarker_adjustments", biomarker_flags),
                },
                metadata={"agent_name": "meal", "llm_generated": True},
            )
        except Exception as e:
            _logger.error("MealPlanAgent LLM call failed: %s", e, exc_info=True)
            return None

    def _get_system_prompt(self) -> str:
        if self._system_prompt is None:
            self._system_prompt = (
                Path(__file__).resolve().parent.parent / "prompts" / "dietitian_system_prompt.txt"
            ).read_text(encoding="utf-8")
        return self._system_prompt

    def _build_prompt(
        self,
        user_prompt: str,
        profile: dict[str, Any],
        restrictions: set[str],
        preferences: set[str],
        biomarker_flags: list[str],
        specialist_outputs: dict[str, Any] | None = None,
    ) -> str:
        age = profile.get("age", "unknown")
        gender = profile.get("gender", "unknown")
        weight = profile.get("weight_kg", "unknown")
        height = profile.get("height_cm", "unknown")
        conditions = ", ".join(profile.get("conditions", [])) or "none"
        diet_restrictions = ", ".join(sorted(restrictions)) or "none"
        diet_preferences = ", ".join(sorted(preferences)) or "none"
        flags = ", ".join(biomarker_flags) or "none"

        endo = (specialist_outputs or {}).get("endocrinologist", {})
        endo_data = endo.get("data", {}) if isinstance(endo, dict) else {}
        endo_context = (
            f"Endocrinologist findings: narrative={endo_data.get('clinical_narrative', 'none')}, "
            f"constraints={endo_data.get('dietary_constraints', [])}"
            if endo_data else "No endocrinologist findings."
        )

        return (
            f"{self._get_system_prompt()}\n\n"
            f"USER PROFILE:\n"
            f"- Age: {age}, Gender: {gender}\n"
            f"- Height: {height}cm, Current weight: {weight}kg\n"
            f"- Dietary restrictions: {diet_restrictions}\n"
            f"- Dietary preferences: {diet_preferences}\n"
            f"- Health conditions: {conditions}\n"
            f"- Biomarker flags: {flags}\n\n"
            f"ENDOCRINOLOGIST CONTEXT:\n{endo_context}\n\n"
            f"USER REQUEST: \"{user_prompt}\"\n\n"
            f"Generate 3 meals that directly address the user's request, respect their profile, and honour the endocrinologist's constraints.\n"
            f"Respond with ONLY valid JSON, no other text:\n"
            f'{{\n'
            f'  "meals": [\n'
            f'    {{"meal": "breakfast", "name": "<meal name and brief description>"}},\n'
            f'    {{"meal": "lunch", "name": "<meal name and brief description>"}},\n'
            f'    {{"meal": "dinner", "name": "<meal name and brief description>"}}\n'
            f'  ],\n'
            f'  "constraints_applied": ["<constraint 1>"],\n'
            f'  "biomarker_adjustments": ["<adjustment 1>"]\n'
            f'}}'
        )

    def _normalize_meal(self, item: dict[str, Any]) -> dict[str, Any]:
        meal_type = item.get("meal") or item.get("type") or item.get("meal_type") or ""
        name = item.get("name") or item.get("description") or item.get("dish") or ""
        return {"meal": meal_type, "name": name}

    def _parse_json(self, raw: str) -> dict[str, Any]:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in response")
        return json.loads(match.group())

    def _biomarker_flags(self, lab_records: list[dict[str, object]]) -> list[str]:
        flags: list[str] = []
        for record in lab_records:
            test_name = str(record.get("test_name", "")).lower()
            status = str(record.get("status", "")).lower()
            if test_name in {"hba1c", "hemoglobin a1c"} and status in {"elevated", "high"}:
                flags.append("lower_sugar")
            if test_name == "alt" and status in {"elevated", "high"}:
                flags.append("lower_saturated_fat")
            if test_name in {"uric acid", "urate"} and status in {"elevated", "high"}:
                flags.append("lower_purine")
        return sorted(set(flags))

    def _choose_breakfast(self, restrictions: set[str], biomarker_flags: list[str]) -> str:
        if "vegan" in restrictions:
            return "Tofu scramble with oats and berries"
        if "vegetarian" in restrictions:
            return "Greek yogurt bowl with chia and berries"
        if "lower_sugar" in biomarker_flags:
            return "Eggs with avocado and unsweetened oats"
        return "Oatmeal with berries and boiled eggs"

    def _choose_lunch(self, restrictions: set[str], preferences: set[str], biomarker_flags: list[str]) -> str:
        if "vegan" in restrictions:
            return "Lentil quinoa bowl with roasted vegetables"
        if "lower_purine" in biomarker_flags:
            return "Chicken salad with brown rice and cucumber"
        if "mediterranean" in preferences:
            return "Grilled chicken grain bowl with olive oil dressing"
        return "Turkey wrap with side salad"

    def _choose_dinner(self, restrictions: set[str], biomarker_flags: list[str]) -> str:
        if "vegan" in restrictions:
            return "Baked tofu with quinoa and steamed broccoli"
        if "lower_saturated_fat" in biomarker_flags:
            return "Baked salmon with sweet potato and green beans"
        if "vegetarian" in restrictions:
            return "Chickpea pasta with spinach and tomato"
        return "Grilled chicken with brown rice and vegetables"

from __future__ import annotations

import json
import re
from typing import Any

from app.agents.interface import AgentInput, AgentInterface
from app.providers.base import LLMProvider
from app.schemas.output import AIOutput


class MealPlanAgent(AgentInterface):
    def __init__(self, provider: LLMProvider | None = None) -> None:
        self._provider = provider

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
        print(f"[DEBUG] MealPlanAgent calling LLM, provider={type(self._provider).__name__}", flush=True)
        try:
            raw = self._provider.generate(prompt)  # type: ignore[union-attr]
            print(f"[DEBUG] MealPlanAgent LLM raw response (first 200 chars): {raw[:200]}", flush=True)
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
            import logging
            logging.getLogger(__name__).error("MealPlanAgent LLM call failed: %s", e, exc_info=True)
            return None

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

        return f"""You are a weight loss nutrition expert. Generate a personalized daily meal plan.

USER PROFILE:
- Age: {age}, Gender: {gender}
- Height: {height}cm, Current weight: {weight}kg
- Dietary restrictions: {diet_restrictions}
- Dietary preferences: {diet_preferences}
- Health conditions: {conditions}
- Biomarker flags: {flags}

ENDOCRINOLOGIST CONTEXT:
{endo_context}

USER REQUEST: "{user_prompt}"

Generate 3 meals that directly address the user's request, respect their profile, and honour the endocrinologist's constraints.
Respond with ONLY valid JSON, no other text:
{{
  "meals": [
    {{"meal": "breakfast", "name": "<meal name and brief description>"}},
    {{"meal": "lunch", "name": "<meal name and brief description>"}},
    {{"meal": "dinner", "name": "<meal name and brief description>"}}
  ],
  "constraints_applied": ["<constraint 1>"],
  "biomarker_adjustments": ["<adjustment 1>"]
}}"""

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

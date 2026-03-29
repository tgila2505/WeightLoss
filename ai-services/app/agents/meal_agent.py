from __future__ import annotations

from app.agents.interface import AgentInput, AgentInterface
from app.schemas.output import AIOutput


class MealPlanAgent(AgentInterface):
    def run(self, request: AgentInput) -> AIOutput:
        profile = request.variables.get("user_profile") or {}
        lab_records = request.variables.get("lab_records") or []
        restrictions = {item.lower() for item in profile.get("dietary_restrictions", [])}
        preferences = {item.lower() for item in profile.get("dietary_preferences", [])}

        biomarker_flags = self._biomarker_flags(lab_records)
        meals = [
            {
                "meal": "breakfast",
                "name": self._choose_breakfast(restrictions, biomarker_flags),
            },
            {
                "meal": "lunch",
                "name": self._choose_lunch(restrictions, preferences, biomarker_flags),
            },
            {
                "meal": "dinner",
                "name": self._choose_dinner(restrictions, biomarker_flags),
            },
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

    def _choose_breakfast(
        self,
        restrictions: set[str],
        biomarker_flags: list[str],
    ) -> str:
        if "vegan" in restrictions:
            return "Tofu scramble with oats and berries"
        if "vegetarian" in restrictions:
            return "Greek yogurt bowl with chia and berries"
        if "lower_sugar" in biomarker_flags:
            return "Eggs with avocado and unsweetened oats"
        return "Oatmeal with berries and boiled eggs"

    def _choose_lunch(
        self,
        restrictions: set[str],
        preferences: set[str],
        biomarker_flags: list[str],
    ) -> str:
        if "vegan" in restrictions:
            return "Lentil quinoa bowl with roasted vegetables"
        if "lower_purine" in biomarker_flags:
            return "Chicken salad with brown rice and cucumber"
        if "mediterranean" in preferences:
            return "Grilled chicken grain bowl with olive oil dressing"
        return "Turkey wrap with side salad"

    def _choose_dinner(
        self,
        restrictions: set[str],
        biomarker_flags: list[str],
    ) -> str:
        if "vegan" in restrictions:
            return "Baked tofu with quinoa and steamed broccoli"
        if "lower_saturated_fat" in biomarker_flags:
            return "Baked salmon with sweet potato and green beans"
        if "vegetarian" in restrictions:
            return "Chickpea pasta with spinach and tomato"
        return "Grilled chicken with brown rice and vegetables"

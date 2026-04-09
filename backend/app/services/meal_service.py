import os
from datetime import datetime, timezone

import httpx
from sqlalchemy.orm import Session

from app.models.user import User
from app.schemas.habits import MealSuggestionResponse

AI_SERVICES_URL = os.getenv("AI_SERVICES_INTERNAL_URL", "http://localhost:8001")

# Half-day cache: keyed by (user_id, period)
_meal_cache: dict[str, dict] = {}


def _get_period() -> str:
    hour = datetime.now(timezone.utc).hour
    if hour < 12:
        return "morning"
    elif hour < 17:
        return "afternoon"
    return "evening"


class MealService:
    def get_suggestion(self, session: Session, user: User) -> MealSuggestionResponse:
        period = _get_period()
        cache_key = f"{user.id}:{period}:{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"

        if cache_key in _meal_cache:
            cached = _meal_cache[cache_key]
            return MealSuggestionResponse(
                meal_name=cached["meal_name"],
                foods=cached["foods"],
                macros=cached["macros"],
                prep_note=cached.get("prep_note"),
                cached=True,
                generated_at=datetime.fromisoformat(cached["generated_at"]),
            )

        payload = {
            "user_id": user.id,
            "meal_period": period,
            "macro_targets": {},
            "recent_adherence": None,
        }

        try:
            response = httpx.post(
                f"{AI_SERVICES_URL}/internal/meal-suggestion",
                json=payload,
                timeout=15.0,
            )
            response.raise_for_status()
            data = response.json()
        except Exception:
            data = {
                "meal_name": "Balanced Plate",
                "foods": ["Lean protein (150g)", "Complex carb (100g)", "Vegetables", "Healthy fat"],
                "macros": {"protein_g": 35, "carbs_g": 40, "fat_g": 10, "calories": 390},
                "prep_note": None,
                "generated_at": datetime.now(timezone.utc).isoformat(),
            }

        _meal_cache[cache_key] = data

        return MealSuggestionResponse(
            meal_name=data["meal_name"],
            foods=data["foods"],
            macros=data["macros"],
            prep_note=data.get("prep_note"),
            cached=False,
            generated_at=datetime.fromisoformat(data["generated_at"]),
        )


meal_service = MealService()

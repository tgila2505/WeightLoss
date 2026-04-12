from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from app.agents.interface import AgentInput, AgentInterface
from app.providers.base import LLMProvider
from app.schemas.output import AIOutput
from app.utils.json_utils import parse_json

_logger = logging.getLogger(__name__)
_PROMPTS_DIR = Path(__file__).resolve().parent.parent / "prompts"


class PersonalTrainerAgent(AgentInterface):
    def __init__(self, provider: LLMProvider | None = None) -> None:
        self._provider = provider
        self._system_prompt: str | None = None

    def _get_system_prompt(self) -> str:
        if self._system_prompt is None:
            self._system_prompt = (
                _PROMPTS_DIR / "trainer_system_prompt.txt"
            ).read_text(encoding="utf-8")
        return self._system_prompt

    def run(self, request: AgentInput) -> AIOutput:
        metrics = request.variables.get("health_metrics") or []
        adherence_signals = request.variables.get("adherence_signals") or []
        specialist_outputs = request.variables.get("specialist_outputs") or {}
        latest_metric = metrics[0] if metrics else {}

        if self._provider is not None:
            llm_result = self._run_with_llm(request, latest_metric, adherence_signals, specialist_outputs)
            if llm_result is not None:
                return llm_result

        return self._run_rule_based(latest_metric, adherence_signals, specialist_outputs)

    def _run_with_llm(
        self,
        request: AgentInput,
        latest_metric: dict[str, Any],
        adherence_signals: list[dict[str, Any]],
        specialist_outputs: dict[str, Any],
    ) -> AIOutput | None:
        prompt = self._build_prompt(request.prompt, latest_metric, adherence_signals, specialist_outputs)
        try:
            provider = self._provider
            raw = provider.generate(prompt)  # type: ignore[union-attr]
            data = parse_json(raw)
            activity = [self._normalize_activity(a) for a in data.get("activity", [])]
            activity = [a for a in activity if a.get("title") and a.get("frequency")]
            if not activity:
                return None
            return AIOutput(
                content="Activity plan generated",
                data={
                    "activity": activity,
                    "behavioral_actions": data.get("behavioral_actions", []),
                    "adherence_signals": [
                        self._normalize_signal(s)
                        for s in data.get("adherence_signals", self._default_signals())
                        if s.get("name")
                    ],
                    "weekly_plan": data.get("weekly_plan", {}),
                },
                metadata={"agent_name": "trainer", "llm_generated": True},
            )
        except Exception as exc:
            _logger.error("PersonalTrainerAgent LLM call failed: %s", exc, exc_info=True)
            return None

    def _build_prompt(
        self,
        user_prompt: str,
        latest_metric: dict[str, Any],
        adherence_signals: list[dict[str, Any]],
        specialist_outputs: dict[str, Any],
    ) -> str:
        weight = latest_metric.get("weight_kg", "unknown")
        steps = latest_metric.get("steps", "unknown")
        sleep = latest_metric.get("sleep_hours", "unknown")
        trend = latest_metric.get("weight_trend", "unknown")
        completed = sum(1 for s in adherence_signals if s.get("completed"))
        total = len(adherence_signals)
        adherence_summary = f"{completed}/{total} signals completed" if total else "no data"

        endo = specialist_outputs.get("endocrinologist", {})
        endo_data = endo.get("data", {}) if isinstance(endo, dict) else {}
        endo_context = (
            f"Endocrinologist findings: risks={endo_data.get('risks', {})}, "
            f"constraints={endo_data.get('dietary_constraints', [])}"
            if endo_data else "No endocrinologist data."
        )

        dietitian = specialist_outputs.get("dietitian", {})
        dietitian_data = dietitian.get("data", {}) if isinstance(dietitian, dict) else {}
        dietitian_context = (
            f"Dietitian meal plan: {len(dietitian_data.get('meals', []))} meals planned, "
            f"adjustments={dietitian_data.get('meal_biomarker_adjustments', [])}"
            if dietitian_data else "No dietitian data."
        )

        return (
            f"{self._get_system_prompt()}\n\n"
            f"PATIENT METRICS:\n"
            f"- Weight: {weight}kg, Steps/day: {steps}, Sleep: {sleep}h, Trend: {trend}\n"
            f"- Adherence: {adherence_summary}\n\n"
            f"SPECIALIST CONTEXT:\n"
            f"- {endo_context}\n"
            f"- {dietitian_context}\n\n"
            f"PATIENT REQUEST: \"{user_prompt}\""
        )

    def _run_rule_based(
        self,
        latest_metric: dict[str, Any],
        adherence_signals: list[dict[str, Any]],
        specialist_outputs: dict[str, Any],
    ) -> AIOutput:
        steps = latest_metric.get("steps")
        weight_trend = str(latest_metric.get("weight_trend") or "")
        sleep_hours = latest_metric.get("sleep_hours")

        # Determine intensity: lower if medical risks present
        endo = specialist_outputs.get("endocrinologist", {})
        endo_risks = (endo.get("data", {}) or {}).get("risks", {})
        has_medical_risk = (
            endo_risks.get("diabetes_risk") or endo_risks.get("liver_stress_risk")
            if isinstance(endo_risks, dict) else False
        )
        intensity = "low" if has_medical_risk else "moderate"

        # Build activity list
        if isinstance(steps, int) and steps < 5000:
            activity = [{"title": "Brisk Walking", "frequency": "20 minutes, daily"}]
            freq_per_week = 7
            duration = 20
        elif weight_trend == "increasing":
            activity = [
                {"title": "Brisk Walking", "frequency": "30 minutes, 5 days/week"},
                {"title": "Bodyweight Circuit", "frequency": "20 minutes, 3 days/week"},
            ]
            freq_per_week = 5
            duration = 30
        else:
            activity = [
                {"title": "Maintenance Walk", "frequency": "20 minutes daily"},
                {"title": "Light Resistance Training", "frequency": "30 minutes, 2 days/week"},
            ]
            freq_per_week = 5
            duration = 20

        behavioral_actions: list[str] = []
        if isinstance(sleep_hours, (int, float)) and sleep_hours < 7:
            behavioral_actions.append("Set a fixed bedtime — poor sleep raises cortisol and stalls fat loss.")
        if not adherence_signals or any(not bool(s.get("completed")) for s in adherence_signals):
            behavioral_actions.append("Prepare your workout clothes and bag the evening before.")
        behavioral_actions.append("Track your daily steps — awareness alone increases movement.")

        weekly_plan = {
            "exercise_types": [a["title"] for a in activity],
            "frequency_per_week": freq_per_week,
            "duration_minutes": duration,
            "intensity": intensity,
            "progression_notes": "After 2 consistent weeks, add 5 minutes per session.",
        }

        return AIOutput(
            content="Activity plan generated",
            data={
                "activity": activity,
                "behavioral_actions": behavioral_actions,
                "adherence_signals": self._default_signals(adherence_signals),
                "weekly_plan": weekly_plan,
            },
            metadata={"agent_name": "trainer"},
        )

    def _normalize_activity(self, item: dict[str, Any]) -> dict[str, Any]:
        title = item.get("title") or item.get("name") or item.get("activity") or ""
        frequency = item.get("frequency") or item.get("duration") or item.get("schedule") or ""
        return {"title": title, "frequency": frequency}

    def _normalize_signal(self, item: dict[str, Any]) -> dict[str, Any]:
        name = item.get("name") or ""
        completed = bool(item.get("completed", False))
        score = item.get("score")
        return {"name": name, "completed": completed, "score": int(score) if isinstance(score, float) else score}


    def _default_signals(self, adherence_signals: list[dict[str, Any]] | None = None) -> list[dict[str, Any]]:
        if adherence_signals:
            return adherence_signals
        return [
            {"name": "daily_walk_completed", "completed": False, "score": None},
            {"name": "strength_session_done", "completed": False, "score": None},
            {"name": "sleep_goal_met", "completed": False, "score": None},
        ]

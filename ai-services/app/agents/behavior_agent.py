from __future__ import annotations

from app.agents.interface import AgentInput, AgentInterface
from app.schemas.output import AIOutput


class BehaviorAgent(AgentInterface):
    def run(self, request: AgentInput) -> AIOutput:
        metrics = request.variables.get("health_metrics") or []
        adherence_signals = request.variables.get("adherence_signals") or []

        latest_metric = metrics[0] if metrics else {}
        activity = self._build_activity(latest_metric)
        behavior_actions = self._build_behavior_actions(latest_metric, adherence_signals)
        signals = self._default_signals(adherence_signals)

        return AIOutput(
            content="Behavior plan generated",
            data={
                "activity": activity,
                "behavioral_actions": behavior_actions,
                "adherence_signals": signals,
            },
            metadata={"agent_name": "behavior"},
        )

    def _build_activity(self, latest_metric: dict[str, object]) -> list[dict[str, str]]:
        steps = latest_metric.get("steps")
        weight_trend = str(latest_metric.get("weight_trend") or "")
        if isinstance(steps, int) and steps < 7000:
            return [{"title": "Walking", "frequency": "30 minutes, 5 days/week"}]
        if weight_trend == "increasing":
            return [{"title": "Cardio", "frequency": "20 minutes, 4 days/week"}]
        return [{"title": "Maintenance walk", "frequency": "20 minutes daily"}]

    def _build_behavior_actions(
        self,
        latest_metric: dict[str, object],
        adherence_signals: list[dict[str, object]],
    ) -> list[str]:
        actions: list[str] = []
        sleep_hours = latest_metric.get("sleep_hours")
        if isinstance(sleep_hours, (int, float)) and sleep_hours < 7:
            actions.append("Set a fixed bedtime to improve sleep consistency.")
        if not adherence_signals or any(not bool(signal.get("completed")) for signal in adherence_signals):
            actions.append("Prepare tomorrow's meals the night before.")
        actions.append("Carry a water bottle and aim for regular hydration.")
        return actions

    def _default_signals(
        self,
        adherence_signals: list[dict[str, object]],
    ) -> list[dict[str, object]]:
        if adherence_signals:
            return adherence_signals
        return [
            {"name": "meal_plan_followed", "completed": False, "score": None},
            {"name": "daily_walk_completed", "completed": False, "score": None},
            {"name": "sleep_goal_met", "completed": False, "score": None},
        ]

from __future__ import annotations

import json
import re
from typing import Any

from app.agents.interface import AgentInput, AgentInterface
from app.providers.base import LLMProvider
from app.schemas.output import AIOutput


class BehaviorAgent(AgentInterface):
    def __init__(self, provider: LLMProvider | None = None) -> None:
        self._provider = provider

    def run(self, request: AgentInput) -> AIOutput:
        metrics = request.variables.get("health_metrics") or []
        adherence_signals = request.variables.get("adherence_signals") or []
        latest_metric = metrics[0] if metrics else {}

        if self._provider is not None:
            llm_result = self._run_with_llm(request, latest_metric, adherence_signals)
            if llm_result is not None:
                return llm_result

        return AIOutput(
            content="Behavior plan generated",
            data={
                "activity": self._build_activity(latest_metric),
                "behavioral_actions": self._build_behavior_actions(latest_metric, adherence_signals),
                "adherence_signals": self._default_signals(adherence_signals),
            },
            metadata={"agent_name": "behavior"},
        )

    def _run_with_llm(
        self,
        request: AgentInput,
        latest_metric: dict[str, Any],
        adherence_signals: list[dict[str, Any]],
    ) -> AIOutput | None:
        prompt = self._build_prompt(request.prompt, latest_metric, adherence_signals)
        try:
            raw = self._provider.generate(prompt)  # type: ignore[union-attr]
            data = self._parse_json(raw)
            activity = [self._normalize_activity(a) for a in data.get("activity", [])]
            activity = [a for a in activity if a.get("title") and a.get("frequency")]
            if not activity and not data.get("behavioral_actions"):
                return None
            return AIOutput(
                content="Behavior plan generated",
                data={
                    "activity": activity,
                    "behavioral_actions": data.get("behavioral_actions", []),
                    "adherence_signals": data.get("adherence_signals", self._default_signals(adherence_signals)),
                },
                metadata={"agent_name": "behavior", "llm_generated": True},
            )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error("BehaviorAgent LLM call failed: %s", e, exc_info=True)
            return None

    def _build_prompt(
        self,
        user_prompt: str,
        latest_metric: dict[str, Any],
        adherence_signals: list[dict[str, Any]],
    ) -> str:
        weight = latest_metric.get("weight_kg", "unknown")
        steps = latest_metric.get("steps", "unknown")
        sleep = latest_metric.get("sleep_hours", "unknown")
        trend = latest_metric.get("weight_trend", "unknown")
        completed = sum(1 for s in adherence_signals if s.get("completed"))
        total = len(adherence_signals)
        adherence_summary = f"{completed}/{total} signals completed" if total else "no data"

        return f"""You are a weight loss behavioral coach. Create a personalized activity and behavior plan.

USER METRICS:
- Weight: {weight}kg, Steps/day: {steps}, Sleep: {sleep}h
- Weight trend: {trend}
- Adherence: {adherence_summary}

USER REQUEST: "{user_prompt}"

Respond with ONLY valid JSON, no other text:
{{
  "activity": [
    {{"title": "<activity name>", "frequency": "<frequency and duration>"}}
  ],
  "behavioral_actions": [
    "<actionable behavior tip 1>",
    "<actionable behavior tip 2>",
    "<actionable behavior tip 3>"
  ],
  "adherence_signals": [
    {{"name": "meal_plan_followed", "completed": false, "score": null}},
    {{"name": "daily_walk_completed", "completed": false, "score": null}},
    {{"name": "sleep_goal_met", "completed": false, "score": null}}
  ]
}}"""

    def _normalize_activity(self, item: dict[str, Any]) -> dict[str, Any]:
        title = item.get("title") or item.get("name") or item.get("activity") or ""
        frequency = item.get("frequency") or item.get("duration") or item.get("schedule") or ""
        return {"title": title, "frequency": frequency}

    def _parse_json(self, raw: str) -> dict[str, Any]:
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in response")
        return json.loads(match.group())

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
        if not adherence_signals or any(not bool(s.get("completed")) for s in adherence_signals):
            actions.append("Prepare tomorrow's meals the night before.")
        actions.append("Carry a water bottle and aim for regular hydration.")
        return actions

    def _default_signals(self, adherence_signals: list[dict[str, object]]) -> list[dict[str, object]]:
        if adherence_signals:
            return adherence_signals
        return [
            {"name": "meal_plan_followed", "completed": False, "score": None},
            {"name": "daily_walk_completed", "completed": False, "score": None},
            {"name": "sleep_goal_met", "completed": False, "score": None},
        ]

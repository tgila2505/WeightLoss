from __future__ import annotations

from app.orchestrator.models import OrchestrationContext, RoutedAgentRequest


class OrchestratorRouter:
    _KEYWORDS = {
        "lab": ("lab", "hba1c", "alt", "uric"),
        "meal": ("meal", "diet", "nutrition", "food"),
        "behavior": ("sleep", "habit", "hydration", "activity", "walk"),
    }
    _PRIORITY = {
        "lab": 1,
        "meal": 2,
        "behavior": 3,
        "general": 4,
    }

    def route(self, context: OrchestrationContext) -> list[RoutedAgentRequest]:
        selected: set[str] = set()
        intent_text = f"{context.intent} {context.prompt}".lower()

        for agent_name, keywords in self._KEYWORDS.items():
            if any(keyword in intent_text for keyword in keywords):
                selected.add(agent_name)

        if context.lab_records:
            selected.add("lab")
        if context.health_metrics or context.user_profile is not None:
            selected.add("behavior")
        if context.user_profile is not None or context.health_metrics or context.lab_records:
            selected.add("meal")
        if not selected:
            selected.add("general")

        return [
            RoutedAgentRequest(agent_name=agent_name, priority=self._PRIORITY[agent_name])
            for agent_name in sorted(selected, key=lambda name: self._PRIORITY[name])
        ]

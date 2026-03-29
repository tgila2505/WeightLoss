from __future__ import annotations

from app.orchestrator.models import AggregatedOutputs, ResolvedOutput


class ConflictResolver:
    _CONTRADICTION_RULES = {
        "sugar": (("increase sugar", "raise sugar"), ("reduce sugar", "lower sugar")),
        "activity": (("rest more", "reduce exercise"), ("walk", "exercise", "cardio", "activity")),
        "hydration": (("drink less",), ("hydrate", "water", "hydration")),
        "fat": (("increase saturated fat",), ("limit saturated fat", "lower saturated fat")),
    }

    def resolve(self, aggregated: AggregatedOutputs) -> ResolvedOutput:
        if not aggregated.successful_results:
            return ResolvedOutput(
                final_content="",
                final_data={},
                primary_agent=None,
                conflict_detected=False,
                strategy="no_successful_outputs",
            )

        ordered_results = sorted(
            aggregated.successful_results,
            key=lambda result: result.priority,
        )
        unique_contents: list[str] = []
        for result in ordered_results:
            if result.output.content not in unique_contents:
                unique_contents.append(result.output.content)

        primary_result = ordered_results[0]
        final_data, semantic_conflict = self._merge_data_by_priority(ordered_results)
        conflict_detected = len(unique_contents) > 1 or semantic_conflict
        strategy = "priority_first_merge" if conflict_detected else "single_output"
        final_content = "\n\n".join(unique_contents)

        return ResolvedOutput(
            final_content=final_content,
            final_data=final_data,
            primary_agent=primary_result.agent_name,
            conflict_detected=conflict_detected,
            strategy=strategy,
        )

    def _merge_data_by_priority(self, ordered_results) -> tuple[dict[str, object], bool]:
        merged_data: dict[str, object] = {}
        conflict_detected = False
        tracked_actions: list[str] = []

        for result in ordered_results:
            for key, value in result.output.data.items():
                existing = merged_data.get(key)
                if isinstance(value, list):
                    if all(isinstance(item, str) for item in value):
                        items = list(existing) if isinstance(existing, list) else []
                        for item in value:
                            conflict = self._find_conflict(item, tracked_actions)
                            if conflict is not None:
                                conflict_detected = True
                                continue
                            if item not in items:
                                items.append(item)
                                tracked_actions.append(item)
                        merged_data[key] = items
                    else:
                        items = list(existing) if isinstance(existing, list) else []
                        for item in value:
                            if item not in items:
                                items.append(item)
                        merged_data[key] = items
                elif key not in merged_data:
                    merged_data[key] = value

        return merged_data, conflict_detected

    def _find_conflict(self, candidate: str, existing_items: list[str]) -> str | None:
        candidate_lower = candidate.lower()
        candidate_category = self._categorize(candidate_lower)
        candidate_side = self._side(candidate_lower, candidate_category)
        if candidate_category is None or candidate_side is None:
            return None

        for existing in existing_items:
            existing_lower = existing.lower()
            existing_category = self._categorize(existing_lower)
            existing_side = self._side(existing_lower, existing_category)
            if (
                existing_category == candidate_category
                and existing_side is not None
                and existing_side != candidate_side
            ):
                return existing
        return None

    def _categorize(self, text: str) -> str | None:
        for category, rule in self._CONTRADICTION_RULES.items():
            positive_terms, negative_terms = rule
            if any(term in text for term in positive_terms + negative_terms):
                return category
        return None

    def _side(self, text: str, category: str | None) -> str | None:
        if category is None:
            return None
        positive_terms, negative_terms = self._CONTRADICTION_RULES[category]
        if any(term in text for term in positive_terms):
            return "positive"
        if any(term in text for term in negative_terms):
            return "negative"
        return None

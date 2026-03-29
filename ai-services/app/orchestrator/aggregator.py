from __future__ import annotations

from app.orchestrator.models import AggregatedOutputs, AgentExecutionResult


class OutputAggregator:
    def aggregate(
        self,
        results: list[AgentExecutionResult],
    ) -> AggregatedOutputs:
        successful_results = [result for result in results if result.output.status == "success"]
        failed_results = [result for result in results if result.output.status != "success"]
        merged_data: dict[str, object] = {}
        for result in successful_results:
            for key, value in result.output.data.items():
                existing = merged_data.get(key)
                if isinstance(value, list):
                    items = list(existing) if isinstance(existing, list) else []
                    for item in value:
                        if item not in items:
                            items.append(item)
                    merged_data[key] = items
                elif key not in merged_data:
                    merged_data[key] = value

        return AggregatedOutputs(
            results=results,
            successful_results=successful_results,
            failed_results=failed_results,
            merged_data=merged_data,
        )

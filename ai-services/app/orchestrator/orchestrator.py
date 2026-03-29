from __future__ import annotations

from dataclasses import asdict

from app.agents.interface import AgentInput, AgentInterface
from app.orchestrator.aggregator import OutputAggregator
from app.orchestrator.conflict_resolver import ConflictResolver
from app.orchestrator.models import (
    AgentExecutionResult,
    OrchestrationContext,
    OrchestrationRequest,
)
from app.orchestrator.router import OrchestratorRouter
from app.prompts.template import PromptTemplate
from app.providers.base import LLMProvider
from app.schemas.output import AIOutput
from app.services.adherence_service import AdherenceService
from app.services.recommendation_service import RecommendationService
from app.vector.mock_vector_db import MockVectorDB


class SimpleAgent(AgentInterface):
    def __init__(self, provider: LLMProvider, template: PromptTemplate) -> None:
        self._provider = provider
        self._template = template

    def run(self, request: AgentInput) -> AIOutput:
        prompt = self._template.render(
            {
                "prompt": request.prompt,
                "task_type": request.task_type,
                **request.variables,
            }
        )
        content = self._provider.generate(prompt)
        return AIOutput(
            content=content,
            metadata={"task_type": request.task_type, **request.metadata},
        )


class Orchestrator:
    def __init__(
        self,
        agent: AgentInterface | dict[str, AgentInterface],
        recommendation_service: RecommendationService | None = None,
        adherence_service: AdherenceService | None = None,
        vector_store: MockVectorDB | None = None,
    ) -> None:
        if isinstance(agent, dict):
            self._agents = dict(agent)
        else:
            self._agents = {"general": agent}

        self._router = OrchestratorRouter()
        self._aggregator = OutputAggregator()
        self._conflict_resolver = ConflictResolver()
        self._recommendation_service = recommendation_service
        self._adherence_service = adherence_service
        self._vector_store = vector_store

    def handle(self, request: AgentInput | OrchestrationRequest) -> AIOutput:
        if isinstance(request, AgentInput):
            default_agent = self._agents.get("general")
            if default_agent is None:
                raise ValueError("general agent is required for AgentInput requests")
            return default_agent.run(request)

        retrieved_context = self._retrieve_recommendation_context(request.context)
        routed_agents = self._router.route(request.context)
        results: list[AgentExecutionResult] = []
        for routed_agent in routed_agents:
            agent = self._agents.get(routed_agent.agent_name) or self._agents.get("general")
            if agent is None:
                results.append(
                    AgentExecutionResult(
                        agent_name=routed_agent.agent_name,
                        priority=routed_agent.priority,
                        output=AIOutput(
                            content="",
                            status="error",
                            error=f"Agent '{routed_agent.agent_name}' is not available",
                            metadata={"agent_name": routed_agent.agent_name},
                        ),
                    )
                )
                continue

            agent_request = self._build_agent_request(
                request.context,
                routed_agent.agent_name,
                retrieved_context,
            )
            output = agent.run(agent_request)
            results.append(
                AgentExecutionResult(
                    agent_name=routed_agent.agent_name,
                    priority=routed_agent.priority,
                    output=output,
                )
            )

        aggregated = self._aggregator.aggregate(results)
        resolved = self._conflict_resolver.resolve(aggregated)
        status = "success" if aggregated.successful_results else "error"
        error = None if aggregated.successful_results else "No successful agent outputs"

        return AIOutput(
            content=resolved.final_content,
            status=status,
            data=resolved.final_data,
            error=error,
            metadata=self._final_metadata(
                request.context,
                aggregated,
                resolved,
                retrieved_context,
            ),
        )

    def _build_agent_request(
        self,
        context: OrchestrationContext,
        agent_name: str,
        retrieved_context: list[dict[str, object]],
    ) -> AgentInput:
        return AgentInput(
            prompt=context.prompt,
            task_type=agent_name,
            variables={
                "intent": context.intent,
                "user_profile": asdict(context.user_profile) if context.user_profile else None,
                "health_metrics": [asdict(metric) for metric in context.health_metrics],
                "lab_records": [asdict(record) for record in context.lab_records],
                "adherence_signals": [asdict(signal) for signal in context.adherence_signals],
                "consistency_level": context.consistency_level,
                "adaptive_adjustment": context.adaptive_adjustment,
                "past_recommendations": retrieved_context,
            },
            metadata={
                "agent_name": agent_name,
                **context.metadata,
            },
        )

    def _final_metadata(
        self,
        context: OrchestrationContext,
        aggregated,
        resolved,
        retrieved_context: list[dict[str, object]],
    ) -> dict[str, object]:
        final_plan = self._build_final_plan(context, resolved.final_data)
        recommendation_id = None
        adherence_record_id = None
        user_id = context.user_profile.user_id if context.user_profile else None

        if user_id is not None and aggregated.successful_results:
            recommendation = self._get_recommendation_service().store_recommendation(
                user_id=user_id,
                intent=context.intent,
                content=resolved.final_content,
                data=final_plan,
            )
            recommendation_id = recommendation.id
            adherence_record = self._get_adherence_service().store_signals(
                recommendation_id=recommendation.id,
                user_id=user_id,
                signals=final_plan["adherence_signals"],
            )
            adherence_record_id = adherence_record.id
            self._get_vector_store().upsert(
                namespace="recommendations",
                item_id=str(recommendation.id),
                text=resolved.final_content,
                metadata={"user_id": user_id, "intent": context.intent},
            )

        return {
            "intent": context.intent,
            "routed_agents": [result.agent_name for result in aggregated.results],
            "primary_agent": resolved.primary_agent,
            "conflict_detected": resolved.conflict_detected,
            "merge_strategy": resolved.strategy,
            "recommendation_id": recommendation_id,
            "adherence_record_id": adherence_record_id,
            "retrieved_recommendations": retrieved_context,
            "final_plan": final_plan,
            "agent_outputs": [
                {
                    "agent_name": result.agent_name,
                    "status": result.output.status,
                    "content": result.output.content,
                    "data": result.output.data,
                    "metadata": result.output.metadata,
                    "error": result.output.error,
                }
                for result in aggregated.results
            ],
        }

    def _build_final_plan(
        self,
        context: OrchestrationContext,
        merged_data: dict[str, object],
    ) -> dict[str, object]:
        return {
            "intent": context.intent,
            "meals": merged_data.get("meals", []),
            "activity": merged_data.get("activity", []),
            "behavioral_actions": merged_data.get("behavioral_actions", []),
            "lab_insights": merged_data.get("lab_insights", []),
            "risks": merged_data.get("risks", []),
            "recommendations": list(
                dict.fromkeys(
                    list(merged_data.get("lab_actions", []))
                    + list(merged_data.get("behavioral_actions", []))
                )
            ),
            "adherence_signals": merged_data.get("adherence_signals", []),
            "constraints_applied": merged_data.get("meal_constraints_applied", []),
            "biomarker_adjustments": merged_data.get("meal_biomarker_adjustments", []),
        }

    def _retrieve_recommendation_context(
        self,
        context: OrchestrationContext,
    ) -> list[dict[str, object]]:
        user_id = context.user_profile.user_id if context.user_profile else None
        if user_id is None:
            return []

        hits = self._get_vector_store().search(
            namespace="recommendations",
            query=f"user:{user_id} {context.intent} {context.prompt}",
            limit=3,
        )
        retrieved: list[dict[str, object]] = []
        for hit in hits:
            metadata = hit.get("metadata", {})
            if metadata.get("user_id") != user_id:
                continue
            retrieved.append(
                {
                    "id": hit["id"],
                    "score": hit["score"],
                    "text": hit["text"],
                    "metadata": metadata,
                }
            )
        return retrieved

    def _get_recommendation_service(self) -> RecommendationService:
        if self._recommendation_service is None:
            self._recommendation_service = RecommendationService()
        return self._recommendation_service

    def _get_adherence_service(self) -> AdherenceService:
        if self._adherence_service is None:
            self._adherence_service = AdherenceService()
        return self._adherence_service

    def _get_vector_store(self) -> MockVectorDB:
        if self._vector_store is None:
            self._vector_store = MockVectorDB()
        return self._vector_store

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
        specialist_outputs: dict[str, dict[str, object]] = {}

        # --- Cascading pipeline: Endocrinologist → Dietitian → PersonalTrainer ---
        cascade_order = [
            ("lab", "endocrinologist"),
            ("meal", "dietitian"),
            ("trainer", "trainer"),
        ]
        results: list[AgentExecutionResult] = []
        for agent_key, output_key in cascade_order:
            agent = self._agents.get(agent_key)
            if agent is None:
                continue
            agent_request = self._build_agent_request(
                request.context, agent_key, retrieved_context, specialist_outputs
            )
            output = agent.run(agent_request)
            specialist_outputs[output_key] = self._serialize_output(output)
            results.append(
                AgentExecutionResult(
                    agent_name=agent_key,
                    priority={"lab": 1, "meal": 2, "trainer": 3}.get(agent_key, 4),
                    output=output,
                )
            )

        # --- GP synthesis: reads all three specialist outputs ---
        gp_agent = self._agents.get("gp")
        gp_output: AIOutput | None = None
        if gp_agent is not None:
            gp_request = self._build_agent_request(
                request.context, "gp", retrieved_context, specialist_outputs
            )
            gp_output = gp_agent.run(gp_request)

        # ConflictResolver runs here as a keyword-level safety net only.
        # Primary conflict arbitration happens inside GPAgent via clinical reasoning.
        # See: app/prompts/gp_system_prompt.txt
        aggregated = self._aggregator.aggregate(results)
        resolved = self._conflict_resolver.resolve(aggregated)
        status = "success" if aggregated.successful_results else "error"
        error = None if aggregated.successful_results else "No successful agent outputs"

        # GP response becomes the primary content when available
        primary_content = (
            gp_output.content
            if gp_output is not None and gp_output.status == "success"
            else resolved.final_content
        )
        primary_data = dict(resolved.final_data)
        if gp_output is not None and gp_output.status == "success":
            primary_data["gp_summary"] = gp_output.data

        return AIOutput(
            content=primary_content,
            status=status,
            data=primary_data,
            error=error,
            metadata=self._final_metadata(
                request.context,
                aggregated,
                resolved,
                retrieved_context,
            ),
        )

    def _serialize_output(self, output: AIOutput) -> dict[str, object]:
        """Convert AIOutput to a plain dict for passing as specialist_outputs.

        Shallow-copies data and metadata to prevent downstream mutation from
        corrupting AgentExecutionResult outputs already stored in results.
        """
        return {
            "content": output.content,
            "data": dict(output.data),
            "metadata": dict(output.metadata),
            "status": output.status,
        }

    def _build_agent_request(
        self,
        context: OrchestrationContext,
        agent_name: str,
        retrieved_context: list[dict[str, object]],
        specialist_outputs: dict[str, dict[str, object]] | None = None,
    ) -> AgentInput:
        return AgentInput(
            prompt=context.prompt,
            task_type=agent_name,
            variables={
                "intent": context.intent,
                "user_profile": asdict(context.user_profile) if context.user_profile else None,
                "master_profile": context.master_profile or "",
                "health_metrics": [asdict(metric) for metric in context.health_metrics],
                "lab_records": [asdict(record) for record in context.lab_records],
                "adherence_signals": [asdict(signal) for signal in context.adherence_signals],
                "consistency_level": context.consistency_level,
                "adaptive_adjustment": context.adaptive_adjustment,
                "past_recommendations": retrieved_context,
                "specialist_outputs": specialist_outputs or {},
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

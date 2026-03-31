from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents import BehaviorAgent, LabInterpretationAgent, MealPlanAgent
from app.orchestrator import (
    AdherenceSignalContext,
    HealthMetricContext,
    LabRecordContext,
    OrchestrationContext,
    OrchestrationRequest,
    Orchestrator,
    UserProfileContext,
)
from app.providers.fallback_provider import FallbackProvider, ProvidersExhaustedError


class UserProfilePayload(BaseModel):
    user_id: int | None = None
    age: int | None = None
    gender: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: list[str] = Field(default_factory=list)
    dietary_restrictions: list[str] = Field(default_factory=list)
    dietary_preferences: list[str] = Field(default_factory=list)


class HealthMetricPayload(BaseModel):
    weight_kg: float | None = None
    bmi: float | None = None
    steps: int | None = None
    sleep_hours: float | None = None
    weight_trend: str | None = None
    bmi_trend: str | None = None
    recorded_at: str | None = None


class LabRecordPayload(BaseModel):
    test_name: str
    value: float
    unit: str | None = None
    status: str | None = None
    trend: str | None = None
    recorded_date: str | None = None


class AdherenceSignalPayload(BaseModel):
    name: str
    completed: bool = False
    score: int | None = None


class OrchestrationContextPayload(BaseModel):
    prompt: str
    intent: str
    user_profile: UserProfilePayload | None = None
    health_metrics: list[HealthMetricPayload] = Field(default_factory=list)
    lab_records: list[LabRecordPayload] = Field(default_factory=list)
    adherence_signals: list[AdherenceSignalPayload] = Field(default_factory=list)
    consistency_level: str | None = None
    adaptive_adjustment: dict[str, str] | None = None
    metadata: dict[str, object] = Field(default_factory=dict)
    groq_api_key: str | None = None
    mistral_api_key: str | None = None


class OrchestratorRequestPayload(BaseModel):
    context: OrchestrationContextPayload


app = FastAPI(title="WeightLoss AI Services", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_rule_based_orchestrator = Orchestrator(
    {
        "meal": MealPlanAgent(),
        "lab": LabInterpretationAgent(),
        "behavior": BehaviorAgent(),
        "general": MealPlanAgent(),
    }
)


def _build_orchestrator(groq_key: str | None, mistral_key: str | None) -> Orchestrator:
    if groq_key and mistral_key:
        provider = FallbackProvider(groq_key=groq_key, mistral_key=mistral_key)
        return Orchestrator(
            {
                "meal": MealPlanAgent(provider=provider),
                "lab": LabInterpretationAgent(),
                "behavior": BehaviorAgent(provider=provider),
                "general": MealPlanAgent(provider=provider),
            }
        )
    return _rule_based_orchestrator


@app.post("/orchestrator")
def run_orchestrator(payload: OrchestratorRequestPayload) -> dict[str, object]:
    context = payload.context

    groq_key_preview = (context.groq_api_key or "")[:8] or "MISSING"
    mistral_key_preview = (context.mistral_api_key or "")[:8] or "MISSING"
    print(f"[DEBUG] groq_api_key={groq_key_preview}... mistral_api_key={mistral_key_preview}... prompt={context.prompt!r}", flush=True)

    try:
        orchestrator = _build_orchestrator(context.groq_api_key, context.mistral_api_key)
        request = OrchestrationRequest(
            context=OrchestrationContext(
                prompt=context.prompt,
                intent=context.intent,
                user_profile=(
                    UserProfileContext(**context.user_profile.model_dump(
                        exclude={"groq_api_key", "mistral_api_key"}
                    ))
                    if context.user_profile is not None
                    else None
                ),
                health_metrics=[
                    HealthMetricContext(**metric.model_dump()) for metric in context.health_metrics
                ],
                lab_records=[
                    LabRecordContext(**record.model_dump()) for record in context.lab_records
                ],
                adherence_signals=[
                    AdherenceSignalContext(**signal.model_dump())
                    for signal in context.adherence_signals
                ],
                consistency_level=context.consistency_level,
                adaptive_adjustment=context.adaptive_adjustment,
                metadata=context.metadata,
            )
        )
        response = orchestrator.handle(request)
        return asdict(response)

    except ProvidersExhaustedError as e:
        resets_at = e.resets_at or "within 24 hours"
        raise HTTPException(
            status_code=503,
            detail=f"Both AI providers (Groq and Mistral) have reached their daily rate limits. "
                   f"Please try again after {resets_at}.",
        ) from e

from __future__ import annotations

from dataclasses import asdict

from fastapi import FastAPI
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


class OrchestratorRequestPayload(BaseModel):
    context: OrchestrationContextPayload


app = FastAPI(title="WeightLoss AI Services", version="0.1.0")
orchestrator = Orchestrator(
    {
        "meal": MealPlanAgent(),
        "lab": LabInterpretationAgent(),
        "behavior": BehaviorAgent(),
        "general": MealPlanAgent(),
    }
)


@app.post("/orchestrator")
def run_orchestrator(payload: OrchestratorRequestPayload) -> dict[str, object]:
    context = payload.context
    request = OrchestrationRequest(
        context=OrchestrationContext(
            prompt=context.prompt,
            intent=context.intent,
            user_profile=(
                UserProfileContext(**context.user_profile.model_dump())
                if context.user_profile is not None
                else None
            ),
            health_metrics=[
                HealthMetricContext(**metric.model_dump()) for metric in context.health_metrics
            ],
            lab_records=[LabRecordContext(**record.model_dump()) for record in context.lab_records],
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

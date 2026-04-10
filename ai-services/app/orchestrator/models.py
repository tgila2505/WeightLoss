from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.schemas.output import AIOutput


@dataclass(frozen=True)
class UserProfileContext:
    user_id: int | None = None
    age: int | None = None
    gender: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: list[str] = field(default_factory=list)
    dietary_restrictions: list[str] = field(default_factory=list)
    dietary_preferences: list[str] = field(default_factory=list)
    activity_level: str | None = None


@dataclass(frozen=True)
class HealthMetricContext:
    weight_kg: float | None = None
    bmi: float | None = None
    steps: int | None = None
    sleep_hours: float | None = None
    weight_trend: str | None = None
    bmi_trend: str | None = None
    recorded_at: str | None = None


@dataclass(frozen=True)
class LabRecordContext:
    test_name: str
    value: float
    unit: str | None = None
    status: str | None = None
    trend: str | None = None
    recorded_date: str | None = None


@dataclass(frozen=True)
class AdherenceSignalContext:
    name: str
    completed: bool = False
    score: int | None = None


@dataclass(frozen=True)
class OrchestrationContext:
    prompt: str
    intent: str
    user_profile: UserProfileContext | None = None
    health_metrics: list[HealthMetricContext] = field(default_factory=list)
    lab_records: list[LabRecordContext] = field(default_factory=list)
    adherence_signals: list[AdherenceSignalContext] = field(default_factory=list)
    master_profile: str | None = None
    consistency_level: str | None = None
    adaptive_adjustment: dict[str, str] | None = None
    metadata: dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        if not self.prompt.strip():
            raise ValueError("prompt is required")
        if not self.intent.strip():
            raise ValueError("intent is required")


@dataclass(frozen=True)
class OrchestrationRequest:
    context: OrchestrationContext


@dataclass(frozen=True)
class RoutedAgentRequest:
    agent_name: str
    priority: int


@dataclass(frozen=True)
class AgentExecutionResult:
    agent_name: str
    priority: int
    output: AIOutput


@dataclass(frozen=True)
class AggregatedOutputs:
    results: list[AgentExecutionResult]
    successful_results: list[AgentExecutionResult]
    failed_results: list[AgentExecutionResult]
    merged_data: dict[str, Any]


@dataclass(frozen=True)
class ResolvedOutput:
    final_content: str
    final_data: dict[str, Any]
    primary_agent: str | None
    conflict_detected: bool
    strategy: str

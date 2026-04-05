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


class MasterProfileRequest(BaseModel):
    user_id: int | None = None
    demographics: dict[str, object] = Field(default_factory=dict)
    questionnaire: dict[str, dict[str, object]] = Field(default_factory=dict)
    groq_api_key: str | None = None
    mistral_api_key: str | None = None


@app.post("/orchestrator/master-profile")
def generate_master_profile(payload: MasterProfileRequest) -> dict[str, object]:
    demographics = payload.demographics
    questionnaire = payload.questionnaire

    sections: list[str] = []

    # Demographics & Goals
    demo_parts: list[str] = []
    if demographics.get("name"):
        demo_parts.append(f"Name: {demographics['name']}")
    if demographics.get("age"):
        demo_parts.append(f"Age: {demographics['age']}")
    if demographics.get("gender"):
        demo_parts.append(f"Gender: {demographics['gender']}")
    if demographics.get("height_cm"):
        demo_parts.append(f"Height: {demographics['height_cm']} cm")
    if demographics.get("weight_kg"):
        demo_parts.append(f"Weight: {demographics['weight_kg']} kg")
    if demographics.get("goal_target_weight_kg"):
        demo_parts.append(f"Target weight: {demographics['goal_target_weight_kg']} kg")
    if demographics.get("health_conditions"):
        demo_parts.append(f"Known conditions: {demographics['health_conditions']}")
    if demographics.get("activity_level"):
        demo_parts.append(f"Activity level: {demographics['activity_level']}")
    if demographics.get("diet_pattern"):
        demo_parts.append(f"Diet pattern: {demographics['diet_pattern']}")
    sections.append("## Demographics & Goals\n" + ("\n".join(demo_parts) if demo_parts else "Not reported."))

    def q(node_id: str) -> dict[str, object]:
        return questionnaire.get(node_id, {})

    def fmt_list(values: object) -> str:
        if isinstance(values, list) and values:
            return ", ".join(str(v) for v in values)
        if isinstance(values, str) and values:
            return values
        return ""

    # Medical History
    med_parts: list[str] = []
    for section_id, label in [
        ("past-medical-history-cardiovascular", "Cardiovascular"),
        ("past-medical-history-endocrine", "Endocrine"),
        ("past-medical-history-musculoskeletal", "Musculoskeletal"),
        ("past-medical-history-neurologic", "Neurologic"),
        ("past-medical-history-psychiatric", "Psychiatric"),
        ("past-medical-history-respiratory", "Respiratory"),
        ("past-medical-history-gastroenterological", "Gastrointestinal"),
        ("past-medical-history-gynecologic", "Gynecologic"),
        ("past-medical-history-infections", "Infections"),
        ("past-medical-history-cancer", "Cancer"),
        ("past-medical-history-surgical", "Surgical history"),
        ("past-medical-history-other", "Other"),
    ]:
        items = fmt_list(q(section_id).get("conditions") or q(section_id).get("procedures"))
        if items:
            med_parts.append(f"- **{label}:** {items}")
    meds = fmt_list(q("regular-medication-each-medicine").get("medications"))
    if meds:
        med_parts.append(f"- **Current medications:** {meds}")
    family_parent = fmt_list(q("family-history-relative").get("parent"))
    family_sibling = fmt_list(q("family-history-relative").get("sibling"))
    if family_parent:
        med_parts.append(f"- **Family history (parents):** {family_parent}")
    if family_sibling:
        med_parts.append(f"- **Family history (siblings):** {family_sibling}")
    sections.append("## Medical History Summary\n" + ("\n".join(med_parts) if med_parts else "Not reported."))

    # Lifestyle Snapshot
    life_parts: list[str] = []
    sleep_hours = fmt_list(q("sleep-routine").get("total-sleep"))
    if sleep_hours:
        life_parts.append(f"- **Sleep:** {sleep_hours}")
    sleep_syms = fmt_list(q("sleep-symptoms-current-state").get("symptoms"))
    if sleep_syms:
        life_parts.append(f"- **Sleep symptoms:** {sleep_syms}")
    stress_level = q("stress-symptoms-current-state").get("stress-level")
    if stress_level:
        life_parts.append(f"- **Stress level:** {stress_level}/10")
    stress_syms = fmt_list(q("stress-symptoms-current-state").get("symptoms"))
    if stress_syms:
        life_parts.append(f"- **Stress symptoms:** {stress_syms}")
    exercise_freq = fmt_list(q("exercise-habits").get("frequency"))
    exercise_types = fmt_list(q("exercise-types").get("types"))
    if exercise_freq:
        life_parts.append(f"- **Exercise frequency:** {exercise_freq}")
    if exercise_types:
        life_parts.append(f"- **Exercise types:** {exercise_types}")
    diet = fmt_list(q("nutrition-groups").get("diet-pattern"))
    if diet:
        life_parts.append(f"- **Diet pattern:** {diet}")
    gut_syms = fmt_list(q("gut-health-current-state").get("symptoms"))
    if gut_syms:
        life_parts.append(f"- **Gut health symptoms:** {gut_syms}")
    dental = fmt_list(q("dental-hygiene").get("brushing"))
    if dental:
        life_parts.append(f"- **Dental hygiene:** {dental}")
    social_sit = fmt_list(q("social-history-current-state").get("living-situation"))
    if social_sit:
        life_parts.append(f"- **Living situation:** {social_sit}")
    sections.append("## Lifestyle Snapshot\n" + ("\n".join(life_parts) if life_parts else "Not reported."))

    # Key Risk Factors
    risk_parts: list[str] = []
    cardio_conds = fmt_list(q("past-medical-history-cardiovascular").get("conditions"))
    if cardio_conds:
        risk_parts.append(f"- Cardiovascular: {cardio_conds}")
    endo_conds = fmt_list(q("past-medical-history-endocrine").get("conditions"))
    if endo_conds:
        risk_parts.append(f"- Metabolic/Endocrine: {endo_conds}")
    inflammation = q("inflammation-current-state").get("pain-level")
    if inflammation and int(str(inflammation)) >= 5:
        risk_parts.append(f"- Elevated inflammation score: {inflammation}/10")
    smoking = q("harmful-substance-habits").get("smokes")
    if smoking == "yes":
        risk_parts.append("- Current tobacco user")
    alcohol = fmt_list(q("harmful-substance-habits").get("alcohol-frequency"))
    if alcohol and "day" in alcohol.lower():
        risk_parts.append(f"- Daily alcohol use: {alcohol}")
    diabetes_dx = fmt_list(q("diabetes-history-diagnosis").get("diagnosis"))
    if diabetes_dx and diabetes_dx != "No":
        risk_parts.append(f"- Diabetes status: {diabetes_dx}")
    aerobic = fmt_list(q("aerobics-capacity-current-state").get("fitness-level"))
    if aerobic and "Poor" in aerobic:
        risk_parts.append(f"- Poor aerobic capacity: {aerobic}")
    sections.append("## Key Risk Factors\n" + ("\n".join(risk_parts) if risk_parts else "No significant risk factors identified from reported data."))

    # Behavioral Readiness
    readiness_node = q("change-readiness-readiness")
    readiness_parts: list[str] = []
    readiness_labels = {
        "motivated": "Motivation",
        "capable": "Self-efficacy",
        "clear-why": "Clarity of why",
        "time-resources": "Time/resources",
        "social-support": "Social support",
        "willing-to-track": "Willing to track",
        "wants-coaching": "Open to coaching",
    }
    for key, label in readiness_labels.items():
        val = readiness_node.get(key)
        if val:
            readiness_parts.append(f"- {label}: {val}/5")
    purpose = fmt_list(q("purpose-assessment").get("sense-of-purpose"))
    if purpose:
        readiness_parts.append(f"- Sense of purpose: {purpose}")
    sections.append("## Behavioral Readiness & Motivation\n" + ("\n".join(readiness_parts) if readiness_parts else "Not reported."))

    # Recommendations Summary
    rec_parts: list[str] = []
    if sleep_hours and ("< 5" in sleep_hours or "5-6" in sleep_hours):
        rec_parts.append("- Prioritize sleep extension — reported sleep below optimal range")
    if stress_level and int(str(stress_level)) >= 7:
        rec_parts.append("- Address high stress — consider structured stress management techniques")
    if exercise_freq and ("Rarely" in exercise_freq or "month" in exercise_freq):
        rec_parts.append("- Begin graduated exercise program — currently sedentary")
    if diabetes_dx and diabetes_dx != "No":
        rec_parts.append("- Metabolic optimization focus — diabetes/pre-diabetes present")
    if smoking == "yes":
        rec_parts.append("- Smoking cessation support recommended")
    if not rec_parts:
        rec_parts.append("- Maintain current healthy habits and monitor key biomarkers")
    sections.append("## Personalized Recommendations Summary\n" + "\n".join(rec_parts))

    profile_text = "\n\n".join(sections)
    return {"profile_text": profile_text}

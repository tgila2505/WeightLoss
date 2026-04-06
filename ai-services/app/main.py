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
    master_profile: str | None = None
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
                master_profile=context.master_profile,
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


class LabRecordEntry(BaseModel):
    test_name: str
    value: float
    unit: str | None = None
    reference_range: str | None = None
    recorded_date: str | None = None


class HealthMetricEntry(BaseModel):
    weight_kg: float | None = None
    bmi: float | None = None
    steps: int | None = None
    sleep_hours: float | None = None
    recorded_at: str | None = None


class MasterProfileRequest(BaseModel):
    user_id: int | None = None
    demographics: dict[str, object] = Field(default_factory=dict)
    questionnaire: dict[str, dict[str, object]] = Field(default_factory=dict)
    lab_records: list[LabRecordEntry] = Field(default_factory=list)
    health_metrics: list[HealthMetricEntry] = Field(default_factory=list)
    groq_api_key: str | None = None
    mistral_api_key: str | None = None


def _build_data_context(
    demographics: dict,
    questionnaire: dict,
    lab_records: list[LabRecordEntry],
    health_metrics: list[HealthMetricEntry],
) -> str:
    """Build a structured plain-text data summary to feed into the LLM prompt."""
    lines: list[str] = []

    # --- Demographics ---
    lines.append("=== PATIENT DEMOGRAPHICS ===")
    for key, label in [
        ("name", "Name"), ("age", "Age"), ("gender", "Gender"),
        ("height_cm", "Height (cm)"), ("weight_kg", "Current weight (kg)"),
        ("goal_target_weight_kg", "Target weight (kg)"),
        ("health_conditions", "Known conditions"),
        ("activity_level", "Activity level"), ("diet_pattern", "Diet pattern"),
    ]:
        val = demographics.get(key)
        if val:
            lines.append(f"  {label}: {val}")

    def q(node_id: str) -> dict:
        return questionnaire.get(node_id, {})

    def fmt(values: object) -> str:
        if isinstance(values, list) and values:
            return ", ".join(str(v) for v in values)
        if isinstance(values, str) and values:
            return values
        return ""

    # --- Medical History ---
    lines.append("\n=== MEDICAL HISTORY ===")
    for sid, label in [
        ("past-medical-history-cardiovascular", "Cardiovascular"),
        ("past-medical-history-endocrine", "Endocrine/Metabolic"),
        ("past-medical-history-musculoskeletal", "Musculoskeletal"),
        ("past-medical-history-neurologic", "Neurologic"),
        ("past-medical-history-psychiatric", "Psychiatric"),
        ("past-medical-history-respiratory", "Respiratory"),
        ("past-medical-history-gastroenterological", "Gastrointestinal"),
        ("past-medical-history-cancer", "Cancer"),
        ("past-medical-history-surgical", "Surgical history"),
    ]:
        items = fmt(q(sid).get("conditions") or q(sid).get("procedures"))
        if items:
            lines.append(f"  {label}: {items}")
    meds = fmt(q("regular-medication-each-medicine").get("medications"))
    if meds:
        lines.append(f"  Current medications: {meds}")
    fp = fmt(q("family-history-relative").get("parent"))
    fs = fmt(q("family-history-relative").get("sibling"))
    if fp:
        lines.append(f"  Family history (parents): {fp}")
    if fs:
        lines.append(f"  Family history (siblings): {fs}")
    diabetes_dx = fmt(q("diabetes-history-diagnosis").get("diagnosis"))
    if diabetes_dx:
        lines.append(f"  Diabetes status: {diabetes_dx}")

    # --- Lifestyle ---
    lines.append("\n=== LIFESTYLE ===")
    sleep_h = fmt(q("sleep-routine").get("total-sleep"))
    if sleep_h:
        lines.append(f"  Sleep: {sleep_h}")
    sleep_s = fmt(q("sleep-symptoms-current-state").get("symptoms"))
    if sleep_s:
        lines.append(f"  Sleep symptoms: {sleep_s}")
    stress = q("stress-symptoms-current-state").get("stress-level")
    if stress:
        lines.append(f"  Stress level: {stress}/10")
    ex_freq = fmt(q("exercise-habits").get("frequency"))
    ex_type = fmt(q("exercise-types").get("types"))
    if ex_freq:
        lines.append(f"  Exercise frequency: {ex_freq}")
    if ex_type:
        lines.append(f"  Exercise types: {ex_type}")
    gut = fmt(q("gut-health-current-state").get("symptoms"))
    if gut:
        lines.append(f"  Gut symptoms: {gut}")
    smoking = q("harmful-substance-habits").get("smokes")
    if smoking:
        lines.append(f"  Smoking: {smoking}")
    alcohol = fmt(q("harmful-substance-habits").get("alcohol-frequency"))
    if alcohol:
        lines.append(f"  Alcohol use: {alcohol}")

    # --- Weight & Metrics Trend ---
    if health_metrics:
        lines.append("\n=== WEIGHT & METRICS HISTORY (most recent first) ===")
        weights = [m.weight_kg for m in health_metrics if m.weight_kg is not None]
        if len(weights) >= 2:
            delta = round(weights[0] - weights[-1], 2)
            direction = "lost" if delta > 0 else ("gained" if delta < 0 else "maintained")
            lines.append(f"  Overall trend: {direction} {abs(delta)} kg over {len(weights)} readings")
        for m in health_metrics[:10]:
            date_str = (m.recorded_at or "")[:10]
            parts = []
            if m.weight_kg is not None:
                parts.append(f"weight={m.weight_kg} kg")
            if m.bmi is not None:
                parts.append(f"BMI={m.bmi}")
            if m.steps is not None:
                parts.append(f"steps={m.steps}")
            if m.sleep_hours is not None:
                parts.append(f"sleep={m.sleep_hours}h")
            if parts:
                lines.append(f"  {date_str}: {', '.join(parts)}")

    # --- Lab Results ---
    if lab_records:
        lines.append("\n=== RECENT LAB RESULTS (most recent per test) ===")
        seen: dict[str, LabRecordEntry] = {}
        for r in lab_records:
            key = r.test_name.lower()
            if key not in seen:
                seen[key] = r
        for r in sorted(seen.values(), key=lambda x: x.test_name):
            line = f"  {r.test_name}: {r.value}"
            if r.unit:
                line += f" {r.unit}"
            if r.reference_range:
                line += f" (ref: {r.reference_range})"
            if r.recorded_date:
                line += f" [{r.recorded_date}]"
            lines.append(line)

    return "\n".join(lines)


def _build_structured_sections(
    demographics: dict,
    questionnaire: dict,
    lab_records: list[LabRecordEntry],
    health_metrics: list[HealthMetricEntry],
) -> list[str]:
    """Build the deterministic structured sections shown at the bottom of the profile."""
    sections: list[str] = []

    def q(node_id: str) -> dict:
        return questionnaire.get(node_id, {})

    def fmt(values: object) -> str:
        if isinstance(values, list) and values:
            return ", ".join(str(v) for v in values)
        if isinstance(values, str) and values:
            return values
        return ""

    # Demographics
    demo_parts: list[str] = []
    for key, label in [
        ("name", "Name"), ("age", "Age"), ("gender", "Gender"),
        ("height_cm", "Height (cm)"), ("weight_kg", "Weight (kg)"),
        ("goal_target_weight_kg", "Target weight (kg)"),
        ("health_conditions", "Known conditions"),
        ("activity_level", "Activity level"), ("diet_pattern", "Diet pattern"),
    ]:
        val = demographics.get(key)
        if val:
            demo_parts.append(f"- **{label}:** {val}")
    sections.append("## Demographics & Goals\n" + ("\n".join(demo_parts) if demo_parts else "Not reported."))

    # Medical History
    med_parts: list[str] = []
    for sid, label in [
        ("past-medical-history-cardiovascular", "Cardiovascular"),
        ("past-medical-history-endocrine", "Endocrine/Metabolic"),
        ("past-medical-history-musculoskeletal", "Musculoskeletal"),
        ("past-medical-history-neurologic", "Neurologic"),
        ("past-medical-history-psychiatric", "Psychiatric"),
        ("past-medical-history-respiratory", "Respiratory"),
        ("past-medical-history-gastroenterological", "Gastrointestinal"),
        ("past-medical-history-cancer", "Cancer"),
        ("past-medical-history-surgical", "Surgical history"),
        ("past-medical-history-other", "Other"),
    ]:
        items = fmt(q(sid).get("conditions") or q(sid).get("procedures"))
        if items:
            med_parts.append(f"- **{label}:** {items}")
    meds = fmt(q("regular-medication-each-medicine").get("medications"))
    if meds:
        med_parts.append(f"- **Current medications:** {meds}")
    fp = fmt(q("family-history-relative").get("parent"))
    fs = fmt(q("family-history-relative").get("sibling"))
    if fp:
        med_parts.append(f"- **Family history (parents):** {fp}")
    if fs:
        med_parts.append(f"- **Family history (siblings):** {fs}")
    sections.append("## Medical History\n" + ("\n".join(med_parts) if med_parts else "Not reported."))

    # Lifestyle
    life_parts: list[str] = []
    for getter, label in [
        (lambda: fmt(q("sleep-routine").get("total-sleep")), "Sleep"),
        (lambda: fmt(q("sleep-symptoms-current-state").get("symptoms")), "Sleep symptoms"),
        (lambda: (str(q("stress-symptoms-current-state").get("stress-level", "")) + "/10") if q("stress-symptoms-current-state").get("stress-level") else "", "Stress level"),
        (lambda: fmt(q("exercise-habits").get("frequency")), "Exercise frequency"),
        (lambda: fmt(q("exercise-types").get("types")), "Exercise types"),
        (lambda: fmt(q("nutrition-groups").get("diet-pattern")), "Diet pattern"),
        (lambda: fmt(q("gut-health-current-state").get("symptoms")), "Gut symptoms"),
    ]:
        val = getter()
        if val:
            life_parts.append(f"- **{label}:** {val}")
    sections.append("## Lifestyle\n" + ("\n".join(life_parts) if life_parts else "Not reported."))

    # Weight & Metrics Trend
    if health_metrics:
        metrics_parts: list[str] = []
        weights = [m.weight_kg for m in health_metrics if m.weight_kg is not None]
        if len(weights) >= 2:
            delta = round(weights[0] - weights[-1], 2)
            direction = "lost" if delta > 0 else ("gained" if delta < 0 else "maintained")
            metrics_parts.append(f"- **Trend:** {direction} {abs(delta)} kg over {len(weights)} readings")
        for m in health_metrics[:10]:
            date_str = (m.recorded_at or "")[:10]
            parts = []
            if m.weight_kg is not None:
                parts.append(f"Weight: {m.weight_kg} kg")
            if m.bmi is not None:
                parts.append(f"BMI: {m.bmi}")
            if m.steps is not None:
                parts.append(f"Steps: {m.steps}")
            if m.sleep_hours is not None:
                parts.append(f"Sleep: {m.sleep_hours} h")
            if parts:
                metrics_parts.append(f"- {date_str}: {', '.join(parts)}")
        if metrics_parts:
            sections.append("## Weight & Metrics Trend\n" + "\n".join(metrics_parts))

    # Lab Results
    if lab_records:
        seen: dict[str, LabRecordEntry] = {}
        for r in lab_records:
            if r.test_name.lower() not in seen:
                seen[r.test_name.lower()] = r
        lab_parts: list[str] = []
        for r in sorted(seen.values(), key=lambda x: x.test_name):
            line = f"- **{r.test_name}:** {r.value}"
            if r.unit:
                line += f" {r.unit}"
            if r.reference_range:
                line += f" (ref: {r.reference_range})"
            if r.recorded_date:
                line += f" — {r.recorded_date}"
            lab_parts.append(line)
        sections.append("## Recent Lab Results\n" + "\n".join(lab_parts))

    return sections


@app.post("/orchestrator/master-profile")
def generate_master_profile(payload: MasterProfileRequest) -> dict[str, object]:
    demographics = payload.demographics
    questionnaire = payload.questionnaire
    lab_records = payload.lab_records
    health_metrics = payload.health_metrics

    # Build structured sections (always present regardless of AI availability)
    structured_sections = _build_structured_sections(
        demographics, questionnaire, lab_records, health_metrics
    )

    # If API keys are available, use the LLM to generate an AI assessment
    ai_assessment: str | None = None
    if payload.groq_api_key or payload.mistral_api_key:
        try:
            groq_key = payload.groq_api_key or ""
            mistral_key = payload.mistral_api_key or ""
            provider = FallbackProvider(groq_key=groq_key, mistral_key=mistral_key)

            data_context = _build_data_context(
                demographics, questionnaire, lab_records, health_metrics
            )

            prompt = f"""You are a clinical health coach writing a comprehensive, personalised health profile for a patient on a weight-loss programme.

Use ONLY the data provided below — do not invent values, hallucinate conditions, or add generic filler.

{data_context}

Write a structured health assessment with these sections (use ## headings):
## Clinical Summary
A 3-5 sentence narrative overview: patient background, primary health challenges, current status, and main goal.

## Lab Result Interpretation
For each lab test provided, briefly explain what the value means and whether it is within, above, or below the reference range. If no lab data is available, omit this section entirely.

## Weight Trend Analysis
Interpret the weight history: direction, pace, consistency. If no weight data is available, omit this section entirely.

## Personalised Recommendations
4-6 specific, actionable bullet points tailored to this patient's conditions, medications, lab results, and lifestyle. Be concrete (e.g. specific foods, exercise types, monitoring targets).

Rules:
- Write in clear, professional but accessible language.
- Do NOT include sections for data that was not provided.
- Do NOT repeat raw numbers already listed in the structured data below.
- Keep total response under 500 words."""

            ai_assessment = provider.generate(prompt, max_tokens=2048)
        except Exception:
            # If the LLM call fails for any reason, fall through to structured-only output
            ai_assessment = None

    # Combine: AI assessment (if available) + structured data sections
    all_sections: list[str] = []
    if ai_assessment:
        all_sections.append(ai_assessment.strip())
        all_sections.append("---")
        all_sections.append("## Reference Data")
        all_sections.extend(structured_sections)
    else:
        all_sections.extend(structured_sections)

    profile_text = "\n\n".join(all_sections)
    return {"profile_text": profile_text}

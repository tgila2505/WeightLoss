from __future__ import annotations

import os
from dataclasses import asdict
from pathlib import Path
from typing import Iterator, Literal

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

_GROQ_API_KEY: str = os.environ.get("GROQ_API_KEY", "")
_MISTRAL_API_KEY: str = os.environ.get("MISTRAL_API_KEY", "")

# NOTE: these are module-level vars intentionally — _reload_env_keys() mutates them.
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.agents import GPAgent, LabInterpretationAgent, MealPlanAgent, PersonalTrainerAgent, PromptEngineerAgent
from app.services.prompt_audit_service import PromptAuditService
from app.services.recommendation_service import RecommendationService
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
from app.agents.interface import AgentInput
from app.chat.router import get_specialist_pipeline


class UserProfilePayload(BaseModel):
    user_id: int | None = None
    age: int | None = None
    gender: str | None = None
    height_cm: float | None = None
    weight_kg: float | None = None
    conditions: list[str] = Field(default_factory=list)
    dietary_restrictions: list[str] = Field(default_factory=list)
    dietary_preferences: list[str] = Field(default_factory=list)
    activity_level: str | None = None


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


class OrchestratorRequestPayload(BaseModel):
    context: OrchestrationContextPayload


class ChatMessageItem(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatUserContext(BaseModel):
    user_profile: UserProfilePayload | None = None
    health_metrics: list[HealthMetricPayload] = Field(default_factory=list)
    lab_records: list[LabRecordPayload] = Field(default_factory=list)
    master_profile: str | None = None


class ChatRequest(BaseModel):
    agent: Literal["gp", "endo", "dietitian", "trainer", "panel"]
    message: str
    conversation_history: list[ChatMessageItem] = Field(default_factory=list)
    user_context: ChatUserContext = Field(default_factory=ChatUserContext)


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
        "trainer": PersonalTrainerAgent(),
        "gp": GPAgent(),
        "general": MealPlanAgent(),
    }
)


def _reload_env_keys() -> None:
    """Re-read GROQ_API_KEY / MISTRAL_API_KEY from the .env file on disk.
    Called by POST /internal/reload-config so the admin console can hot-update keys."""
    global _GROQ_API_KEY, _MISTRAL_API_KEY  # noqa: PLW0603
    env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(env_path, override=True)
    _GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
    _MISTRAL_API_KEY = os.environ.get("MISTRAL_API_KEY", "")


def _get_orchestrator() -> Orchestrator:
    """Return an AI-powered orchestrator using centralized env keys, or fall back to rule-based."""
    if _GROQ_API_KEY and _MISTRAL_API_KEY:
        provider = FallbackProvider(groq_key=_GROQ_API_KEY, mistral_key=_MISTRAL_API_KEY)
        return Orchestrator(
            {
                "meal": MealPlanAgent(provider=provider),
                "lab": LabInterpretationAgent(provider=provider),
                "trainer": PersonalTrainerAgent(provider=provider),
                "gp": GPAgent(provider=provider),
                "general": MealPlanAgent(provider=provider),
            }
        )
    return _rule_based_orchestrator


@app.post("/orchestrator")
def run_orchestrator(payload: OrchestratorRequestPayload) -> dict[str, object]:
    context = payload.context

    try:
        orchestrator = _get_orchestrator()
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


class HabitLogEntry(BaseModel):
    log_date: str
    mood: int | None = None
    adherence: str | None = None
    weight_kg: float | None = None


class DailyFeedbackRequest(BaseModel):
    user_id: int
    habit_log_id: str
    recent_logs: list[HabitLogEntry] = Field(default_factory=list)
    streak_length: int = 0


@app.post("/internal/feedback/daily")
def generate_daily_feedback(payload: DailyFeedbackRequest) -> dict[str, object]:
    """Generate personalized AI feedback after a daily check-in."""
    import json
    from datetime import datetime, timezone

    logs = payload.recent_logs
    streak = payload.streak_length

    # Build adherence summary
    adherence_counts: dict[str, int] = {"on_track": 0, "partial": 0, "off_track": 0}
    weights: list[float] = []
    moods: list[int] = []

    for log in logs:
        if log.adherence in adherence_counts:
            adherence_counts[log.adherence] += 1
        if log.weight_kg is not None:
            weights.append(log.weight_kg)
        if log.mood is not None:
            moods.append(log.mood)

    total_logs = len(logs)
    on_track_pct = round((adherence_counts["on_track"] / total_logs * 100) if total_logs else 0)
    avg_mood = round(sum(moods) / len(moods), 1) if moods else None

    weight_trend = None
    if len(weights) >= 2:
        delta = round(weights[0] - weights[-1], 2)
        weight_trend = f"{abs(delta)} kg {'lost' if delta > 0 else 'gained'} over last {len(weights)} entries"

    # Try AI generation; fall back to rule-based
    ai_insight: str | None = None
    if _GROQ_API_KEY or _MISTRAL_API_KEY:
        try:
            provider = FallbackProvider(groq_key=_GROQ_API_KEY, mistral_key=_MISTRAL_API_KEY)
            prompt = f"""You are a personal weight-loss coach. Generate a brief, specific, encouraging daily check-in response.

Data for the past {total_logs} days:
- Adherence: {on_track_pct}% on track
- Current streak: {streak} days
- Average mood: {avg_mood}/5
- Weight trend: {weight_trend or 'no weight data'}

Respond with a JSON object with these keys (keep each value to 1-2 sentences max):
- insight: a specific observation about their recent pattern
- encouragement: motivational note tied to their actual data
- meal_focus: one concrete nutrition focus for today (or null if no weight data)
- adjustment: suggested behavior change if struggling, else null

Return ONLY the JSON object, no other text."""

            raw = provider.generate(prompt, max_tokens=300)
            # Try to parse JSON from response
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                ai_insight = raw[start:end]
                parsed = json.loads(ai_insight)
                parsed["generated_at"] = datetime.now(timezone.utc).isoformat()
                parsed["model"] = "groq/llama"
                return parsed
        except Exception:
            pass

    # Rule-based fallback
    if on_track_pct >= 80:
        insight = f"Your adherence rate over the past {total_logs} days is {on_track_pct}% — excellent consistency."
    elif on_track_pct >= 50:
        insight = f"You've been on track {on_track_pct}% of the time recently. Solid progress — aim for one more consistent day."
    else:
        insight = f"Your adherence has been {on_track_pct}% recently. Every small step counts — focus on just today."

    if streak >= 14:
        encouragement = f"A {streak}-day streak is real momentum. Keep protecting it."
    elif streak >= 7:
        encouragement = f"{streak} days in a row — you're building a habit now."
    elif streak >= 3:
        encouragement = f"{streak}-day streak started. Three days in a row is how habits form."
    else:
        encouragement = "Today's check-in is the most important one. Keep showing up."

    meal_focus = None
    if weight_trend:
        meal_focus = f"Weight trend: {weight_trend}. Focus on protein at your first meal to sustain the momentum."

    return {
        "insight": insight,
        "encouragement": encouragement,
        "meal_focus": meal_focus,
        "adjustment": None,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model": "rule_based",
    }


class MealSuggestionRequest(BaseModel):
    user_id: int
    meal_period: str = "morning"  # morning | afternoon | evening
    macro_targets: dict[str, float] = Field(default_factory=dict)
    recent_adherence: str | None = None


@app.post("/internal/meal-suggestion")
def generate_meal_suggestion(payload: MealSuggestionRequest) -> dict[str, object]:
    """Generate a meal suggestion for the current time of day."""
    import json
    from datetime import datetime, timezone

    period_map = {
        "morning": "breakfast",
        "afternoon": "lunch",
        "evening": "dinner",
    }
    meal_type = period_map.get(payload.meal_period, "meal")

    if _GROQ_API_KEY or _MISTRAL_API_KEY:
        try:
            provider = FallbackProvider(groq_key=_GROQ_API_KEY, mistral_key=_MISTRAL_API_KEY)

            targets = payload.macro_targets
            target_str = ", ".join(f"{k}: {v}g" for k, v in targets.items()) if targets else "balanced macros"

            prompt = f"""Suggest a specific {meal_type} for someone on a weight-loss programme.

Macro targets: {target_str}
Recent adherence: {payload.recent_adherence or 'not specified'}

Respond with a JSON object:
- meal_name: name of the meal
- foods: array of 3-4 specific foods/ingredients
- macros: object with protein_g, carbs_g, fat_g, calories
- prep_note: one sentence preparation tip (or null)

Return ONLY the JSON object."""

            raw = provider.generate(prompt, max_tokens=200)
            start = raw.find("{")
            end = raw.rfind("}") + 1
            if start >= 0 and end > start:
                parsed = json.loads(raw[start:end])
                parsed["generated_at"] = datetime.now(timezone.utc).isoformat()
                return parsed
        except Exception:
            pass

    # Rule-based fallback
    defaults = {
        "morning": {
            "meal_name": "High-Protein Breakfast Bowl",
            "foods": ["3 eggs", "Greek yogurt (150g)", "Mixed berries", "Oats (40g)"],
            "macros": {"protein_g": 35, "carbs_g": 45, "fat_g": 12, "calories": 430},
            "prep_note": "Scramble the eggs while oats soak — total prep under 10 minutes.",
        },
        "afternoon": {
            "meal_name": "Lean Protein Lunch",
            "foods": ["Grilled chicken (150g)", "Brown rice (100g cooked)", "Steamed broccoli", "Olive oil drizzle"],
            "macros": {"protein_g": 40, "carbs_g": 38, "fat_g": 8, "calories": 390},
            "prep_note": "Batch-cook chicken on Sunday for quick weekday assembly.",
        },
        "evening": {
            "meal_name": "Light Salmon Dinner",
            "foods": ["Salmon fillet (130g)", "Roasted sweet potato (100g)", "Spinach salad", "Lemon-herb dressing"],
            "macros": {"protein_g": 30, "carbs_g": 28, "fat_g": 14, "calories": 360},
            "prep_note": "Season salmon simply — the goal is protein, not complexity.",
        },
    }
    result = defaults.get(payload.meal_period, defaults["afternoon"]).copy()
    from datetime import datetime, timezone
    result["generated_at"] = datetime.now(timezone.utc).isoformat()
    return result


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
    if _GROQ_API_KEY or _MISTRAL_API_KEY:
        try:
            provider = FallbackProvider(groq_key=_GROQ_API_KEY, mistral_key=_MISTRAL_API_KEY)

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


# ── Admin: PromptEngineerAgent audit ─────────────────────────────────────────

class PromptEngineerRequest(BaseModel):
    agent_filter: list[str] | None = None  # None = audit all agents


@app.post("/internal/prompt-engineer/run", include_in_schema=False)
def run_prompt_engineer(payload: PromptEngineerRequest) -> dict[str, object]:
    """
    Run the PromptEngineerAgent audit on one or all agents.
    Returns scores, critiques, and proposed prompts for developer review.
    Does NOT auto-apply any prompt changes.
    """
    if not (_GROQ_API_KEY or _MISTRAL_API_KEY):
        raise HTTPException(
            status_code=503,
            detail="AI provider keys not configured. Set GROQ_API_KEY or MISTRAL_API_KEY.",
        )

    provider = FallbackProvider(groq_key=_GROQ_API_KEY, mistral_key=_MISTRAL_API_KEY)
    rec_svc = RecommendationService()
    audit_svc = PromptAuditService(recommendation_service=rec_svc)
    engineer = PromptEngineerAgent(provider=provider, audit_service=audit_svc)

    report = engineer.run(agent_filter=payload.agent_filter)
    return {"report": report}


# ── Admin: hot-reload env keys ────────────────────────────────────────────────

@app.post("/internal/reload-config", include_in_schema=False)
def reload_config() -> dict[str, str]:
    """Re-read GROQ_API_KEY / MISTRAL_API_KEY from the .env file.
    Called by the backend admin service after the admin updates keys — no restart required."""
    _reload_env_keys()
    return {"status": "ok", "groq_set": str(bool(_GROQ_API_KEY)), "mistral_set": str(bool(_MISTRAL_API_KEY))}


def _get_streaming_provider() -> FallbackProvider | None:
    """Return a FallbackProvider when both API keys are configured, else None."""
    if _GROQ_API_KEY and _MISTRAL_API_KEY:
        return FallbackProvider(groq_key=_GROQ_API_KEY, mistral_key=_MISTRAL_API_KEY)
    return None


@app.post("/chat")
def chat(payload: ChatRequest) -> StreamingResponse:
    """
    Streamed multi-agent chat endpoint.

    Phase 1 (silent): Runs specialist agent(s) based on the selected persona.
    Phase 2 (streamed): GP validates the specialist output and streams its response.
    The frontend shows a 'consultation underway' indicator until the first token arrives.
    """
    import json as _json

    # Build conversation history block for prompt injection
    history_text = ""
    if payload.conversation_history:
        lines = []
        for msg in payload.conversation_history[-20:]:
            prefix = "Patient" if msg.role == "user" else "Consultant"
            lines.append(f"{prefix}: {msg.content}")
        history_text = "\n".join(lines)

    prompt_with_history = payload.message
    if history_text:
        prompt_with_history = (
            f"PRIOR CONVERSATION:\n{history_text}\n\nCURRENT QUESTION: {payload.message}"
        )

    def generate() -> Iterator[str]:
        orch = _get_orchestrator()
        # --- Phase 1: run specialist agents synchronously ---
        specialist_outputs: dict[str, dict] = {}
        for agent_key, output_key in get_specialist_pipeline(payload.agent):
            agent_obj = orch._agents.get(agent_key)
            if agent_obj is None:
                continue
            agent_input = AgentInput(
                prompt=prompt_with_history,
                task_type=agent_key,
                variables={
                    "intent": "question",
                    "user_profile": (
                        payload.user_context.user_profile.model_dump()
                        if payload.user_context.user_profile else None
                    ),
                    "master_profile": payload.user_context.master_profile or "",
                    "health_metrics": [
                        m.model_dump() for m in payload.user_context.health_metrics
                    ],
                    "lab_records": [
                        r.model_dump() for r in payload.user_context.lab_records
                    ],
                    "adherence_signals": [],
                    "consistency_level": None,
                    "adaptive_adjustment": None,
                    "past_recommendations": [],
                    "specialist_outputs": specialist_outputs,
                },
                metadata={"agent_name": agent_key},
            )
            output = agent_obj.run(agent_input)
            specialist_outputs[output_key] = {
                "content": output.content,
                "data": dict(output.data),
                "metadata": dict(output.metadata),
                "status": output.status,
            }

        # --- Phase 2: stream GP response ---
        gp_agent = orch._agents.get("gp")
        if gp_agent is None:
            yield "data: [DONE]\n\n"
            return

        provider = _get_streaming_provider()
        if provider is not None:
            try:
                gp_prompt = gp_agent.build_chat_prompt(prompt_with_history, specialist_outputs)
                for token in provider.stream_generate(gp_prompt):
                    yield f"data: {_json.dumps({'token': token})}\n\n"
            except Exception:
                # Fall back to rule-based on any provider error
                result = gp_agent._run_rule_based(prompt_with_history, specialist_outputs)
                yield f"data: {_json.dumps({'token': result.content})}\n\n"
        else:
            # No provider keys: rule-based response emitted as a single token
            result = gp_agent._run_rule_based(prompt_with_history, specialist_outputs)
            yield f"data: {_json.dumps({'token': result.content})}\n\n"

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")

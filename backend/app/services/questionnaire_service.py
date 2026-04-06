from __future__ import annotations

from datetime import datetime, timezone

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select, update as sql_update
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.health_metrics import HealthMetrics
from app.models.lab import LabRecord
from app.models.profile import Profile
from app.models.questionnaire import MasterUserProfile, QuestionnaireResponse
from app.models.user import User
from app.schemas.questionnaire import QuestionnaireAnswerUpsert


class QuestionnaireService:
    def get_all_answers(self, session: Session, user: User) -> dict[str, dict]:
        rows = session.scalars(
            select(QuestionnaireResponse).where(QuestionnaireResponse.user_id == user.id)
        ).all()
        return {row.node_id: row.answers for row in rows}

    def upsert_node_answers(
        self,
        session: Session,
        user: User,
        node_id: str,
        payload: QuestionnaireAnswerUpsert,
    ) -> QuestionnaireResponse:
        existing = session.scalar(
            select(QuestionnaireResponse).where(
                QuestionnaireResponse.user_id == user.id,
                QuestionnaireResponse.node_id == node_id,
            )
        )
        if existing is None:
            row = QuestionnaireResponse(
                user_id=user.id, node_id=node_id, answers=payload.answers
            )
            session.add(row)
            session.commit()
            session.refresh(row)
            return row
        else:
            existing.answers = payload.answers
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return existing

    def get_master_profile(
        self, session: Session, user: User
    ) -> MasterUserProfile | None:
        return session.scalar(
            select(MasterUserProfile).where(MasterUserProfile.user_id == user.id)
        )

    def generate_master_profile(
        self,
        session: Session,
        user: User,
        groq_key: str | None = None,
        mistral_key: str | None = None,
    ) -> tuple[str, datetime]:
        questionnaire = self.get_all_answers(session, user)
        profile = session.scalar(select(Profile).where(Profile.user_id == user.id))

        demographics: dict = {}
        if profile is not None:
            demographics = {
                "name": profile.name,
                "age": profile.age,
                "gender": profile.gender,
                "height_cm": float(profile.height_cm) if profile.height_cm else None,
                "weight_kg": float(profile.weight_kg) if profile.weight_kg else None,
                "goal_target_weight_kg": (
                    float(profile.goal_target_weight_kg)
                    if profile.goal_target_weight_kg
                    else None
                ),
                "health_conditions": profile.health_conditions,
                "activity_level": profile.activity_level,
                "sleep_hours": float(profile.sleep_hours) if profile.sleep_hours else None,
                "diet_pattern": profile.diet_pattern,
            }

        # Fetch latest lab records (most recent 50, ordered by date desc)
        lab_rows = session.scalars(
            select(LabRecord)
            .where(LabRecord.user_id == user.id)
            .order_by(LabRecord.recorded_date.desc())
            .limit(50)
        ).all()
        lab_records = [
            {
                "test_name": r.test_name,
                "value": float(r.value),
                "unit": r.unit,
                "reference_range": r.reference_range,
                "recorded_date": r.recorded_date.isoformat(),
            }
            for r in lab_rows
        ]

        # Fetch latest health metrics (most recent 30, ordered by recorded_at desc)
        metric_rows = session.scalars(
            select(HealthMetrics)
            .where(HealthMetrics.user_id == user.id)
            .order_by(HealthMetrics.recorded_at.desc())
            .limit(30)
        ).all()
        health_metrics = [
            {
                "weight_kg": float(r.weight_kg) if r.weight_kg else None,
                "bmi": float(r.bmi) if r.bmi else None,
                "steps": r.steps,
                "sleep_hours": float(r.sleep_hours) if r.sleep_hours else None,
                "recorded_at": r.recorded_at.isoformat(),
            }
            for r in metric_rows
        ]

        settings = get_settings()
        try:
            response = httpx.post(
                f"{settings.ai_services_url}/orchestrator/master-profile",
                json={
                    "user_id": user.id,
                    "demographics": demographics,
                    "questionnaire": questionnaire,
                    "lab_records": lab_records,
                    "health_metrics": health_metrics,
                    "groq_api_key": groq_key,
                    "mistral_api_key": mistral_key,
                },
                timeout=120.0,
            )
            response.raise_for_status()
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"AI service error: {exc.response.text}",
            ) from exc
        except httpx.RequestError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="AI service unavailable",
            ) from exc

        profile_text: str = response.json().get("profile_text", "")
        now = datetime.now(timezone.utc)

        print(
            f"[profile] generate called for user_id={user.id} "
            f"new_ts={now.isoformat()} "
            f"text_len={len(profile_text)}",
            flush=True,
        )

        existing = self.get_master_profile(session, user)
        if existing is None:
            session.add(MasterUserProfile(
                user_id=user.id, profile_text=profile_text, generated_at=now
            ))
            session.commit()
            print(f"[profile] inserted new row for user_id={user.id}", flush=True)
        else:
            session.execute(
                sql_update(MasterUserProfile)
                .where(MasterUserProfile.user_id == user.id)
                .values(profile_text=profile_text, generated_at=now)
                .execution_options(synchronize_session=False)
            )
            session.commit()
            print(f"[profile] updated row for user_id={user.id}", flush=True)

        # Return the known values as a plain tuple — no ORM object involved,
        # no lazy-loads, no session-state surprises.
        return profile_text, now

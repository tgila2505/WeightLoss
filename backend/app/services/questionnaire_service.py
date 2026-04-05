from __future__ import annotations

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import get_settings
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
        self, session: Session, user: User
    ) -> MasterUserProfile:
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

        settings = get_settings()
        try:
            response = httpx.post(
                f"{settings.ai_services_url}/orchestrator/master-profile",
                json={
                    "user_id": user.id,
                    "demographics": demographics,
                    "questionnaire": questionnaire,
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

        existing = self.get_master_profile(session, user)
        if existing is None:
            master = MasterUserProfile(user_id=user.id, profile_text=profile_text)
            session.add(master)
            session.commit()
            session.refresh(master)
            return master
        else:
            existing.profile_text = profile_text
            session.add(existing)
            session.commit()
            session.refresh(existing)
            return existing

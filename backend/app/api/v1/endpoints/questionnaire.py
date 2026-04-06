from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.session import get_db_session
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.questionnaire import (
    AllQuestionnaireResponses,
    MasterProfileResponse,
    QuestionnaireAnswerUpsert,
    QuestionnaireNodeResponse,
)
from app.services.questionnaire_service import QuestionnaireService

router = APIRouter()
questionnaire_service = QuestionnaireService()


@router.get("/questionnaire", response_model=AllQuestionnaireResponses)
def get_all_questionnaire_answers(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> AllQuestionnaireResponses:
    responses = questionnaire_service.get_all_answers(session, current_user)
    return AllQuestionnaireResponses(responses=responses)


@router.put(
    "/questionnaire/{node_id}",
    response_model=QuestionnaireNodeResponse,
    status_code=status.HTTP_200_OK,
)
def upsert_node_answers(
    node_id: str,
    payload: QuestionnaireAnswerUpsert,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> QuestionnaireNodeResponse:
    row = questionnaire_service.upsert_node_answers(session, current_user, node_id, payload)
    return QuestionnaireNodeResponse(
        node_id=row.node_id, answers=row.answers, updated_at=row.updated_at
    )


@router.get("/user-profile/master", response_model=MasterProfileResponse)
def get_master_profile(
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MasterProfileResponse:
    master = questionnaire_service.get_master_profile(session, current_user)
    if master is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No master profile found.")
    return MasterProfileResponse(
        profile_text=master.profile_text, generated_at=master.generated_at
    )


@router.post(
    "/user-profile/generate",
    response_model=MasterProfileResponse,
    status_code=status.HTTP_200_OK,
)
def generate_master_profile(
    request: Request,
    session: Session = Depends(get_db_session),
    current_user: User = Depends(get_current_user),
) -> MasterProfileResponse:
    groq_key = request.headers.get("x-groq-key")
    mistral_key = request.headers.get("x-mistral-key")
    profile_text, generated_at = questionnaire_service.generate_master_profile(
        session, current_user, groq_key=groq_key, mistral_key=mistral_key
    )
    return MasterProfileResponse(profile_text=profile_text, generated_at=generated_at)

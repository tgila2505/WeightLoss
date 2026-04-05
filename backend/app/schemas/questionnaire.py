from datetime import datetime

from pydantic import BaseModel


class QuestionnaireAnswerUpsert(BaseModel):
    answers: dict


class QuestionnaireNodeResponse(BaseModel):
    node_id: str
    answers: dict
    updated_at: datetime

    model_config = {"from_attributes": True}


class AllQuestionnaireResponses(BaseModel):
    responses: dict[str, dict]


class MasterProfileResponse(BaseModel):
    profile_text: str
    generated_at: datetime

    model_config = {"from_attributes": True}

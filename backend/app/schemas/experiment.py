from pydantic import BaseModel


class AssignmentResponse(BaseModel):
    experiment_key: str
    variant: str

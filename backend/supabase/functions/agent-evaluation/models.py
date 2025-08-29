
from pydantic import BaseModel, Field
from typing import List, Optional

class EvaluationMetrics(BaseModel):
    relevance: float = Field(ge=0.0, le=1.0)
    completeness: float = Field(ge=0.0, le=1.0)
    accuracy: float = Field(ge=0.0, le=1.0)

class EvaluationRequest(BaseModel):
    originalMessage: str
    response: str
    context: List[str]

class EvaluationResponse(BaseModel):
    quality: int = Field(ge=1, le=10)
    feedback: str
    satisfactory: bool
    metrics: EvaluationMetrics
    nextAgent: Optional[str] = None

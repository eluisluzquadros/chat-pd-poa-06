
from pydantic import BaseModel, Field
from typing import List, Optional, Dict

class RAGRequest(BaseModel):
    message: str
    context: List[str]
    reasoningOutput: Dict[str, any]
    userRole: str

class RAGResponse(BaseModel):
    response: str
    sourceContext: List[str]
    confidence: float = Field(ge=0.0, le=1.0)
    nextAgent: str = Field(default="evaluation")

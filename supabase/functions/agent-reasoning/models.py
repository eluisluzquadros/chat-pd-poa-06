
from pydantic import BaseModel, Field
from typing import List, Optional
from enum import Enum

class UserRole(str, Enum):
    citizen = "citizen"
    admin = "admin"
    supervisor = "supervisor"
    analyst = "analyst"

class AgentMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant|system)$")
    content: str
    metadata: Optional[dict] = None

class ReasoningRequest(BaseModel):
    message: str
    userRole: UserRole
    context: Optional[List[str]] = None

class ReasoningResponse(BaseModel):
    plan: str
    requiredContext: bool
    nextAgent: str = Field(default="rag")

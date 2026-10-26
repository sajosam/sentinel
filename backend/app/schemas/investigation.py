from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PlanStep(BaseModel):
    tool: str
    reason: str
    input: Dict[str, Any] = Field(default_factory=dict)
    expected_evidence: Optional[str] = None


class InvestigationPlan(BaseModel):
    goal: str
    steps: List[PlanStep]
    success_criteria: List[str]


class InvestigationCreate(BaseModel):
    workspace_id: str
    goal: Optional[str] = "Comprehensive Autonomous Security Audit and AI Code Guard Investigation"


class InvestigationStepResponse(BaseModel):
    id: str
    step_index: int
    step_type: str
    status: str
    tool_name: Optional[str] = None
    tool_input: Dict[str, Any] = Field(default_factory=dict)
    tool_output: Dict[str, Any] = Field(default_factory=dict)
    reasoning: str
    created_at: datetime
    completed_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class InvestigationResponse(BaseModel):
    id: str
    workspace_id: str
    goal: str
    status: str
    plan: Dict[str, Any] = Field(default_factory=dict)
    summary: str
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    steps: List[InvestigationStepResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class InvestigationEvent(BaseModel):
    investigation_id: str
    event_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(default_factory=dict)

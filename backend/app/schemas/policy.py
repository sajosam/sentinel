from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class PolicyBase(BaseModel):
    name: str = Field(..., description="Policy name")
    description: Optional[str] = ""
    mode: str = Field("shield", description="shield, monitor, or permissive")
    blocked_tools: List[str] = Field(default_factory=list)
    blocked_patterns: List[str] = Field(default_factory=list)
    allowed_write_paths: List[str] = Field(default_factory=list)
    require_approval_tools: List[str] = Field(default_factory=list)
    is_active: bool = True


class PolicyCreate(PolicyBase):
    workspace_id: str


class PolicyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None
    blocked_tools: Optional[List[str]] = None
    blocked_patterns: Optional[List[str]] = None
    allowed_write_paths: Optional[List[str]] = None
    require_approval_tools: Optional[List[str]] = None
    is_active: Optional[bool] = None


class PolicyResponse(PolicyBase):
    id: str
    workspace_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PolicyEvaluationRequest(BaseModel):
    workspace_id: str
    tool_name: str
    target_path: Optional[str] = None
    action_type: str = "read"  # read, write, execute, network
    command_arguments: Optional[Dict[str, Any]] = None


class PolicyEvaluationResult(BaseModel):
    decision: str  # ALLOW, DENY, REQUIRE_APPROVAL
    reason: str
    risk_level: str  # LOW, MEDIUM, HIGH, CRITICAL
    violated_rule: Optional[str] = None

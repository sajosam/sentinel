from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


class ToolDefinition(BaseModel):
    tool_id: str
    name: str
    purpose: str
    risk_level: str  # LOW, MEDIUM, HIGH
    changes_files: bool
    requires_approval: bool
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    installed: bool = True
    binary_path: Optional[str] = None
    version: Optional[str] = None


class ToolExecutionRequest(BaseModel):
    tool_name: str
    workspace_id: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    investigation_id: Optional[str] = None


class ToolExecutionResult(BaseModel):
    tool_name: str
    exit_code: int
    duration_ms: int
    raw_output: str
    structured_findings: List[Dict[str, Any]] = Field(default_factory=list)
    is_policy_allowed: bool = True
    policy_reason: Optional[str] = None
    error: Optional[str] = None

from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class RemediationProposeRequest(BaseModel):
    finding_id: str


class RemediationApplyRequest(BaseModel):
    remediation_id: str


class RemediationRollbackRequest(BaseModel):
    remediation_id: str


class RemediationResponse(BaseModel):
    id: str
    finding_id: str
    workspace_id: str
    proposed_patch: str
    patch_summary: str
    target_file: str
    status: str
    created_at: datetime
    applied_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class VerificationTriggerRequest(BaseModel):
    finding_id: str
    remediation_id: Optional[str] = None


class VerificationResponse(BaseModel):
    id: str
    finding_id: str
    remediation_id: Optional[str] = None
    status: str
    before_check_result: Dict[str, Any] = Field(default_factory=dict)
    after_check_result: Dict[str, Any] = Field(default_factory=dict)
    test_output: str
    message: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

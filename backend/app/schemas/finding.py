from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class EvidenceResponse(BaseModel):
    id: str
    finding_id: str
    evidence_type: str
    content: str
    metadata_json: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FindingResponse(BaseModel):
    id: str
    workspace_id: str
    investigation_id: Optional[str] = None
    title: str
    category: str
    severity: str
    confidence: str
    file_path: Optional[str] = None
    line_number: Optional[int] = None
    rule_id: Optional[str] = None
    description: str
    impact: str
    remediation: str
    verification_status: str
    is_suppressed: bool
    created_at: datetime
    evidence_items: List[EvidenceResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class FindingFilter(BaseModel):
    workspace_id: Optional[str] = None
    severity: Optional[str] = None
    category: Optional[str] = None
    verification_status: Optional[str] = None

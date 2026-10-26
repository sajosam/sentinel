from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AuditEventCreate(BaseModel):
    workspace_id: Optional[str] = None
    investigation_id: Optional[str] = None
    event_type: str
    source: str = "system"
    action: str
    decision: str = "ALLOW"
    reason: str = ""
    details: Dict[str, Any] = Field(default_factory=dict)


class AuditEventResponse(BaseModel):
    id: str
    workspace_id: Optional[str] = None
    investigation_id: Optional[str] = None
    event_type: str
    source: str
    action: str
    decision: str
    reason: str
    details: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

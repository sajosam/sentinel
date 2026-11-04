from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class AttackRunRequest(BaseModel):
    workspace_id: str
    investigation_id: Optional[str] = None


class AttackResultResponse(BaseModel):
    id: str
    workspace_id: str
    investigation_id: Optional[str] = None
    finding_id: Optional[str] = None
    phase: str
    exploit_name: str
    category: str
    verdict: str
    request_detail: str
    response_detail: str
    reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

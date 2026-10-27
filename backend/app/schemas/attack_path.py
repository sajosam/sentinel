from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class AttackPathNodeResponse(BaseModel):
    id: str
    node_type: str
    label: str
    details: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class AttackPathEdgeResponse(BaseModel):
    id: str
    source_node_id: str
    target_node_id: str
    relation_type: str
    is_inferred: bool
    evidence_reference: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class AttackPathResponse(BaseModel):
    id: str
    investigation_id: str
    workspace_id: str
    name: str
    description: str
    risk_score: float
    entry_point: Optional[str] = None
    vulnerable_component: Optional[str] = None
    possible_impact: Optional[str] = None
    supporting_evidence: Optional[str] = None
    confidence: Optional[str] = "HIGH"
    recommended_next_check: Optional[str] = None
    created_at: datetime
    nodes: List[AttackPathNodeResponse] = Field(default_factory=list)
    edges: List[AttackPathEdgeResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

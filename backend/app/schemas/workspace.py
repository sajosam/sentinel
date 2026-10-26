from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, ConfigDict


class WorkspaceBase(BaseModel):
    display_name: str = Field(..., description="Human-readable project name")
    canonical_path: str = Field(..., description="Absolute canonical directory path on host")
    protected_paths: List[str] = Field(default_factory=list, description="Subpaths strictly locked from write")
    excluded_paths: List[str] = Field(default_factory=lambda: [".git", "node_modules", ".venv", "__pycache__"])
    enabled_checks: List[str] = Field(default_factory=lambda: ["secrets", "sast", "dependencies", "prompt_shield"])


class WorkspaceCreate(WorkspaceBase):
    pass


class WorkspaceUpdate(BaseModel):
    display_name: Optional[str] = None
    protected_paths: Optional[List[str]] = None
    excluded_paths: Optional[List[str]] = None
    enabled_checks: Optional[List[str]] = None


class WorkspaceResponse(WorkspaceBase):
    id: str
    project_type: str
    last_analyzed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

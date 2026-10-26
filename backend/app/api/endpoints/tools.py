from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Workspace
from app.schemas.tool import ToolDefinition, ToolExecutionRequest, ToolExecutionResult
from app.core.tool_registry import tool_registry

router = APIRouter(prefix="/tools", tags=["Tool Execution Service"])


@router.get("", response_model=List[ToolDefinition])
def list_tools():
    return tool_registry.list_tools()


@router.post("/execute", response_model=ToolExecutionResult)
def execute_tool(payload: ToolExecutionRequest, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    canonical_path = Path(workspace.canonical_path).resolve()
    return tool_registry.execute_tool(
        tool_id=payload.tool_name,
        workspace_path=canonical_path,
        arguments=payload.arguments,
        db=db,
        workspace_id=workspace.id,
        investigation_id=payload.investigation_id
    )

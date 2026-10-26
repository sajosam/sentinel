from typing import Optional, Dict, Any
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.agent_fence import AgentFence
from app.schemas.policy import PolicyEvaluationRequest, PolicyEvaluationResult

router = APIRouter(prefix="/shield", tags=["Shield Mode & AgentFence"])


@router.get("/status")
def get_shield_status(workspace_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    return AgentFence.get_status(db, workspace_id)


@router.post("/intercept", response_model=PolicyEvaluationResult)
def intercept_agent_operation(payload: PolicyEvaluationRequest, db: Session = Depends(get_db)):
    return AgentFence.intercept_operation(
        db=db,
        workspace_id=payload.workspace_id,
        tool_name=payload.tool_name,
        target_path=payload.target_path,
        action_type=payload.action_type,
        command_arguments=payload.command_arguments
    )

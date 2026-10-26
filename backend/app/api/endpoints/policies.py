from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Policy, Workspace
from app.schemas.policy import (
    PolicyCreate,
    PolicyUpdate,
    PolicyResponse,
    PolicyEvaluationRequest,
    PolicyEvaluationResult,
)
from app.core.policy_engine import PolicyEngine

router = APIRouter(prefix="/policies", tags=["Policies"])


@router.get("", response_model=List[PolicyResponse])
def list_policies(workspace_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Policy)
    if workspace_id:
        query = query.filter(Policy.workspace_id == workspace_id)
    return query.all()


@router.post("", response_model=PolicyResponse, status_code=status.HTTP_201_CREATED)
def create_policy(payload: PolicyCreate, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    policy = Policy(
        workspace_id=payload.workspace_id,
        name=payload.name,
        description=payload.description or "",
        mode=payload.mode,
        blocked_tools=payload.blocked_tools,
        blocked_patterns=payload.blocked_patterns,
        allowed_write_paths=payload.allowed_write_paths,
        require_approval_tools=payload.require_approval_tools,
        is_active=payload.is_active
    )
    db.add(policy)
    db.commit()
    db.refresh(policy)
    return policy


@router.patch("/{policy_id}", response_model=PolicyResponse)
def update_policy(policy_id: str, payload: PolicyUpdate, db: Session = Depends(get_db)):
    policy = db.query(Policy).filter(Policy.id == policy_id).first()
    if not policy:
        raise HTTPException(status_code=404, detail="Policy not found")

    if payload.name is not None:
        policy.name = payload.name
    if payload.description is not None:
        policy.description = payload.description
    if payload.mode is not None:
        policy.mode = payload.mode
    if payload.blocked_tools is not None:
        policy.blocked_tools = payload.blocked_tools
    if payload.blocked_patterns is not None:
        policy.blocked_patterns = payload.blocked_patterns
    if payload.allowed_write_paths is not None:
        policy.allowed_write_paths = payload.allowed_write_paths
    if payload.require_approval_tools is not None:
        policy.require_approval_tools = payload.require_approval_tools
    if payload.is_active is not None:
        policy.is_active = payload.is_active

    db.commit()
    db.refresh(policy)
    return policy


@router.post("/evaluate", response_model=PolicyEvaluationResult)
def evaluate_policy(payload: PolicyEvaluationRequest, db: Session = Depends(get_db)):
    return PolicyEngine.evaluate_action(
        db=db,
        workspace_id=payload.workspace_id,
        tool_name=payload.tool_name,
        target_path=payload.target_path,
        action_type=payload.action_type,
        command_arguments=payload.command_arguments
    )

import os
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Workspace, Policy
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse
from app.core.audit_service import AuditService

router = APIRouter(prefix="/workspaces", tags=["Workspaces"])


@router.post("", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def create_workspace(payload: WorkspaceCreate, db: Session = Depends(get_db)):
    # Canonicalize and validate path
    try:
        canonical_path = Path(payload.canonical_path).resolve()
        if not canonical_path.exists() or not canonical_path.is_dir():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Path '{payload.canonical_path}' is not a valid directory."
            )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Check for existing workspace with same canonical path
    existing = db.query(Workspace).filter(Workspace.canonical_path == str(canonical_path)).first()
    if existing:
        return existing

    # Detect project type
    project_type = "unknown"
    if (canonical_path / "package.json").exists():
        project_type = "javascript/node"
    elif (canonical_path / "requirements.txt").exists() or (canonical_path / "pyproject.toml").exists():
        project_type = "python"
    elif (canonical_path / "Cargo.toml").exists():
        project_type = "rust"
    elif (canonical_path / "go.mod").exists():
        project_type = "go"

    workspace = Workspace(
        display_name=payload.display_name,
        canonical_path=str(canonical_path),
        project_type=project_type,
        protected_paths=payload.protected_paths or [".env", "config.py", "secrets.json"],
        excluded_paths=payload.excluded_paths,
        enabled_checks=payload.enabled_checks
    )
    db.add(workspace)
    db.commit()
    db.refresh(workspace)

    # Initialize default Shield Mode policy for the workspace
    policy = Policy(
        workspace_id=workspace.id,
        name=f"Shield Mode ({workspace.display_name})",
        description="Default SentinelOS Shield policy protecting sensitive files and blocking unauthorized execution.",
        mode="shield",
        blocked_tools=[],
        blocked_patterns=[".env", "protected_admin_keys.json", "*.key", "id_rsa"],
        allowed_write_paths=[str(canonical_path)],
        require_approval_tools=["destructive_cleaner"]
    )
    db.add(policy)
    db.commit()

    AuditService.record_event(
        db=db,
        workspace_id=workspace.id,
        event_type="workspace_registered",
        action="register_workspace",
        decision="ALLOW",
        reason=f"Registered workspace '{workspace.display_name}' at {canonical_path}",
        details={"project_type": project_type}
    )

    return workspace


@router.get("", response_model=List[WorkspaceResponse])
def list_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).order_by(Workspace.created_at.desc()).all()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
def get_workspace(workspace_id: str, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return workspace


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
def update_workspace(workspace_id: str, payload: WorkspaceUpdate, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    if payload.display_name is not None:
        workspace.display_name = payload.display_name
    if payload.protected_paths is not None:
        workspace.protected_paths = payload.protected_paths
    if payload.excluded_paths is not None:
        workspace.excluded_paths = payload.excluded_paths
    if payload.enabled_checks is not None:
        workspace.enabled_checks = payload.enabled_checks

    db.commit()
    db.refresh(workspace)
    return workspace


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_workspace(workspace_id: str, db: Session = Depends(get_db)):
    workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    db.delete(workspace)
    db.commit()
    return None

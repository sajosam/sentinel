import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Workspace, Policy
from app.schemas.workspace import WorkspaceCreate, WorkspaceUpdate, WorkspaceResponse, WorkspaceCloneRequest
from app.core.audit_service import AuditService
from app.core.verification_engine import NO_CODE_EXECUTION
from app.config import settings

PUBLIC_REPO_URL = re.compile(
    r"^https://(?P<host>github\.com|gitlab\.com|bitbucket\.org)/"
    r"(?P<owner>[A-Za-z0-9][A-Za-z0-9_.-]{0,99})/(?P<repo>[A-Za-z0-9_.-]{1,100}?)(?:\.git)?/?$"
)

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

    return _register_workspace(db, payload, canonical_path)


@router.post("/clone", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
def clone_workspace(payload: WorkspaceCloneRequest, db: Session = Depends(get_db)):
    """Shallow-clone a public Git repository and register it as an untrusted workspace."""
    repo_url = payload.repo_url.strip()
    match = PUBLIC_REPO_URL.match(repo_url)
    if not match:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only public HTTPS repositories on github.com, gitlab.com or bitbucket.org are supported "
                   "(e.g. https://github.com/owner/repo)."
        )
    owner, repo = match.group("owner"), match.group("repo")

    clone_root = Path(settings.CLONE_ROOT).expanduser() if settings.CLONE_ROOT else Path.home() / ".sentinelos" / "repos"
    clone_root.mkdir(parents=True, exist_ok=True)
    dest = (clone_root / f"{owner}__{repo}").resolve()

    if not (dest / ".git").exists():
        env = {**os.environ, "GIT_TERMINAL_PROMPT": "0", "GIT_LFS_SKIP_SMUDGE": "1"}
        try:
            res = subprocess.run(
                # Partial clone: full commit history (needed for git-blame origin tracing) without old file blobs
                ["git", "clone", "--filter=blob:none", "--no-tags", "--", f"https://{match.group('host')}/{owner}/{repo}.git", str(dest)],
                capture_output=True, text=True, timeout=180, env=env
            )
        except subprocess.TimeoutExpired:
            shutil.rmtree(dest, ignore_errors=True)
            raise HTTPException(status_code=status.HTTP_504_GATEWAY_TIMEOUT, detail="git clone timed out")
        if res.returncode != 0:
            shutil.rmtree(dest, ignore_errors=True)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"git clone failed: {res.stderr.strip()[-300:]}"
            )

    create_payload = WorkspaceCreate(
        display_name=payload.display_name or f"{owner}/{repo}",
        canonical_path=str(dest),
        # Never execute code from a cloned third-party repository (e.g. its test suite)
        enabled_checks=["secrets", "sast", "dependencies", "prompt_shield", NO_CODE_EXECUTION],
    )
    return _register_workspace(db, create_payload, dest, source=f"git:{repo_url}")


def _register_workspace(db: Session, payload: WorkspaceCreate, canonical_path: Path, source: str = "local") -> Workspace:
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
        details={"project_type": project_type, "source": source}
    )

    return workspace


@router.get("", response_model=List[WorkspaceResponse])
def list_workspaces(db: Session = Depends(get_db)):
    return db.query(Workspace).order_by(Workspace.created_at.desc()).all()


@router.post("/clear-all")
def clear_all_workspaces(db: Session = Depends(get_db)):
    from app.db.models import (
        Policy, Investigation, InvestigationStep,
        Finding, Evidence, AttackPath, AttackPathNode, AttackPathEdge,
        RemediationRun, VerificationRun, AuditEvent, ToolRun
    )
    db.query(VerificationRun).delete()
    db.query(RemediationRun).delete()
    db.query(Evidence).delete()
    db.query(Finding).delete()
    db.query(AttackPathEdge).delete()
    db.query(AttackPathNode).delete()
    db.query(AttackPath).delete()
    db.query(InvestigationStep).delete()
    db.query(ToolRun).delete()
    db.query(Investigation).delete()
    db.query(AuditEvent).delete()
    db.query(Policy).delete()
    deleted = db.query(Workspace).delete()
    db.commit()
    return {"status": "cleared", "deleted_workspaces": deleted}


@router.get("/browse-dirs")
def browse_directories(path: Optional[str] = None):
    # Determine base directory
    if path and path.strip():
        target = Path(path).expanduser().resolve()
    else:
        target = Path.cwd().resolve()

    if not target.exists() or not target.is_dir():
        target = Path.home().resolve()

    folders = []
    try:
        for item in sorted(target.iterdir(), key=lambda x: x.name.lower()):
            if item.is_dir() and not item.name.startswith("."):
                is_git = (item / ".git").exists()
                is_node = (item / "package.json").exists()
                is_python = (item / "requirements.txt").exists() or (item / "pyproject.toml").exists()
                folders.append({
                    "name": item.name,
                    "path": str(item.resolve()),
                    "is_git": is_git,
                    "is_node": is_node,
                    "is_python": is_python
                })
    except (PermissionError, OSError):
        pass

    parent_path = str(target.parent.resolve()) if target.parent != target else None

    home = Path.home()
    quick_locations = [
        {"name": "Current Workspace", "path": str(Path.cwd().resolve())},
    ]
    if (Path.cwd() / "demo_lab").exists():
        quick_locations.append({"name": "Security Lab", "path": str((Path.cwd() / "demo_lab").resolve())})
    quick_locations.append({"name": "Home (~)", "path": str(home.resolve())})

    for loc in ["github", "Projects", "Desktop", "Documents", "Downloads", "code", "Development"]:
        loc_path = home / loc
        if loc_path.exists() and loc_path.is_dir():
            quick_locations.append({"name": loc, "path": str(loc_path.resolve())})

    return {
        "current_path": str(target.resolve()),
        "current_name": target.name or str(target.resolve()),
        "parent_path": parent_path,
        "folders": folders,
        "quick_locations": quick_locations
    }


@router.post("/pick-dir")
def pick_directory_native():
    import sys
    import subprocess
    if sys.platform == "darwin":
        try:
            cmd = [
                "osascript", "-e",
                'POSIX path of (choose folder with prompt "Select Project Folder for SentinelOS:")'
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            if res.returncode == 0:
                chosen = res.stdout.strip().rstrip("/")
                if chosen and Path(chosen).is_dir():
                    p = Path(chosen).resolve()
                    return {
                        "success": True,
                        "path": str(p),
                        "name": p.name
                    }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Folder selection timed out"}
        except Exception as e:
            return {"success": False, "error": str(e)}
    return {"success": False, "error": "Native picker not supported or cancelled"}


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

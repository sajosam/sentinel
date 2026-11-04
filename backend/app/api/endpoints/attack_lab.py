from typing import List, Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AttackResult, Workspace
from app.schemas.attack import AttackRunRequest, AttackResultResponse
from app.core.attack_lab import AttackLab
from app.core.report import build_report
from app.core.sandbox import docker_available

router = APIRouter(prefix="/attack-lab", tags=["Attack Lab"])


@router.get("/status")
def attack_lab_status():
    """Whether the sandbox prerequisite (Docker) is available on the host."""
    return {"docker_available": docker_available()}


@router.post("/run", status_code=202)
async def run_attack_lab(
    payload: AttackRunRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    workspace = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")
    if not docker_available():
        raise HTTPException(status_code=409, detail="Docker is not available. Start Docker Desktop and retry.")

    background_tasks.add_task(AttackLab.run_async, payload.workspace_id, payload.investigation_id)
    return {"status": "started", "workspace_id": payload.workspace_id, "channel": f"attacklab:{payload.workspace_id}"}


@router.get("", response_model=List[AttackResultResponse])
def list_attack_results(
    workspace_id: str,
    investigation_id: Optional[str] = None,
    db: Session = Depends(get_db),
):
    q = db.query(AttackResult).filter(AttackResult.workspace_id == workspace_id)
    if investigation_id:
        q = q.filter(AttackResult.investigation_id == investigation_id)
    return q.order_by(AttackResult.created_at.asc()).all()


@router.get("/report", response_class=HTMLResponse)
def attack_lab_report(workspace_id: str, investigation_id: Optional[str] = None, db: Session = Depends(get_db)):
    if not db.query(Workspace).filter(Workspace.id == workspace_id).first():
        raise HTTPException(status_code=404, detail="Workspace not found")
    return HTMLResponse(build_report(db, workspace_id, investigation_id))

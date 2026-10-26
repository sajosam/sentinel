import asyncio
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Investigation, Workspace
from app.schemas.investigation import InvestigationCreate, InvestigationResponse
from app.core.orchestrator import SentinelOrchestrator
from app.core.event_bus import event_bus
from app.core.audit_service import AuditService

router = APIRouter(prefix="/investigations", tags=["Investigations"])


@router.post("", response_model=InvestigationResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_investigation(
    payload: InvestigationCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    workspace = db.query(Workspace).filter(Workspace.id == payload.workspace_id).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Workspace not found")

    goal = payload.goal or "Comprehensive Autonomous Security Audit and AI Code Guard Investigation"
    inv = Investigation(
        workspace_id=workspace.id,
        goal=goal,
        status="pending",
        summary=""
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)

    AuditService.record_event(
        db=db,
        workspace_id=workspace.id,
        investigation_id=inv.id,
        event_type="investigation_started",
        action="start_investigation",
        decision="ALLOW",
        reason=f"Started autonomous investigation: {goal}",
        details={"workspace_name": workspace.display_name}
    )

    # Launch autonomous LangGraph orchestrator as background task
    background_tasks.add_task(SentinelOrchestrator.run_investigation_async, inv.id)

    return inv


@router.get("", response_model=List[InvestigationResponse])
def list_investigations(workspace_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Investigation)
    if workspace_id:
        query = query.filter(Investigation.workspace_id == workspace_id)
    return query.order_by(Investigation.created_at.desc()).all()


@router.get("/events/live")
async def live_global_events():
    return StreamingResponse(
        event_bus.subscribe_global(),
        media_type="text/event-stream"
    )


@router.get("/{investigation_id}", response_model=InvestigationResponse)
def get_investigation(investigation_id: str, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")
    return inv


@router.get("/{investigation_id}/events")
async def stream_investigation_events(investigation_id: str, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    return StreamingResponse(
        event_bus.subscribe(investigation_id),
        media_type="text/event-stream"
    )


@router.post("/{investigation_id}/cancel", response_model=InvestigationResponse)
async def cancel_investigation(investigation_id: str, db: Session = Depends(get_db)):
    inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
    if not inv:
        raise HTTPException(status_code=404, detail="Investigation not found")

    if inv.status in ["running", "pending", "planning"]:
        inv.status = "cancelled"
        inv.summary = "Investigation was cancelled by user."
        db.commit()
        await event_bus.publish(
            investigation_id,
            "cancelled",
            {"message": "Investigation cancelled by user."}
        )

    return inv

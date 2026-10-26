from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AuditEvent
from app.schemas.audit import AuditEventResponse

router = APIRouter(prefix="/audit", tags=["Audit & Control Center"])


@router.get("", response_model=List[AuditEventResponse])
def list_audit_events(
    workspace_id: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    decision: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db)
):
    query = db.query(AuditEvent)
    if workspace_id:
        query = query.filter(AuditEvent.workspace_id == workspace_id)
    if event_type:
        query = query.filter(AuditEvent.event_type == event_type)
    if decision:
        query = query.filter(AuditEvent.decision == decision.upper())

    return query.order_by(AuditEvent.created_at.desc()).limit(limit).all()

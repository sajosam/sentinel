from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import AttackPath
from app.schemas.attack_path import AttackPathResponse

router = APIRouter(prefix="/attack_paths", tags=["ThreatLens Attack Paths"])


@router.get("", response_model=List[AttackPathResponse])
def list_attack_paths(
    workspace_id: Optional[str] = None,
    investigation_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(AttackPath)
    if workspace_id:
        query = query.filter(AttackPath.workspace_id == workspace_id)
    if investigation_id:
        query = query.filter(AttackPath.investigation_id == investigation_id)
    return query.order_by(AttackPath.created_at.desc()).all()


@router.get("/{path_id}", response_model=AttackPathResponse)
def get_attack_path(path_id: str, db: Session = Depends(get_db)):
    ap = db.query(AttackPath).filter(AttackPath.id == path_id).first()
    if not ap:
        raise HTTPException(status_code=404, detail="Attack path not found")
    return ap

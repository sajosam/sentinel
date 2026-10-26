from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Finding
from app.schemas.finding import FindingResponse
from app.schemas.remediation import RemediationResponse, VerificationResponse
from app.core.verification_engine import VerificationEngine

router = APIRouter(prefix="/findings", tags=["Findings"])


@router.get("", response_model=List[FindingResponse])
def list_findings(
    workspace_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    verification_status: Optional[str] = Query(None),
    investigation_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(Finding)
    if workspace_id:
        query = query.filter(Finding.workspace_id == workspace_id)
    if severity:
        query = query.filter(Finding.severity == severity.upper())
    if category:
        query = query.filter(Finding.category == category.lower())
    if verification_status:
        query = query.filter(Finding.verification_status == verification_status)
    if investigation_id:
        query = query.filter(Finding.investigation_id == investigation_id)

    return query.order_by(Finding.created_at.desc()).all()


@router.get("/{finding_id}", response_model=FindingResponse)
def get_finding(finding_id: str, db: Session = Depends(get_db)):
    finding = db.query(Finding).filter(Finding.id == finding_id).first()
    if not finding:
        raise HTTPException(status_code=404, detail="Finding not found")
    return finding


@router.post("/{finding_id}/fix", response_model=RemediationResponse)
def propose_finding_fix(finding_id: str, db: Session = Depends(get_db)):
    try:
        return VerificationEngine.propose_remediation(finding_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{finding_id}/verify", response_model=VerificationResponse)
def verify_finding(finding_id: str, db: Session = Depends(get_db)):
    try:
        return VerificationEngine.verify_fix(finding_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import RemediationRun, VerificationRun
from app.schemas.remediation import (
    RemediationResponse,
    RemediationApplyRequest,
    RemediationRollbackRequest,
    VerificationResponse
)
from app.core.verification_engine import VerificationEngine

router = APIRouter(prefix="/remediation", tags=["Remediation & Fix"])


@router.get("/{finding_id}", response_model=List[RemediationResponse])
def get_finding_remediations(finding_id: str, db: Session = Depends(get_db)):
    return db.query(RemediationRun).filter(RemediationRun.finding_id == finding_id).order_by(RemediationRun.created_at.desc()).all()


@router.post("/apply", response_model=RemediationResponse)
def apply_remediation(payload: RemediationApplyRequest, db: Session = Depends(get_db)):
    try:
        return VerificationEngine.apply_remediation(payload.remediation_id, db)
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/rollback", response_model=RemediationResponse)
def rollback_remediation(payload: RemediationRollbackRequest, db: Session = Depends(get_db)):
    try:
        return VerificationEngine.rollback_remediation(payload.remediation_id, db)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verifications/{finding_id}", response_model=List[VerificationResponse])
def get_finding_verifications(finding_id: str, db: Session = Depends(get_db)):
    return db.query(VerificationRun).filter(VerificationRun.finding_id == finding_id).order_by(VerificationRun.created_at.desc()).all()

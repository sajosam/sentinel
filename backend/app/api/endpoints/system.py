import os
import subprocess
from pathlib import Path
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import (
    Workspace,
    Policy,
    Investigation,
    InvestigationStep,
    Finding,
    Evidence,
    AttackPath,
    AttackPathNode,
    AttackPathEdge,
    RemediationRun,
    VerificationRun,
    AuditEvent,
    ToolRun,
)

router = APIRouter(prefix="/system", tags=["System Administration & Maintenance"])


def get_lab_dir() -> Path:
    if os.environ.get("DEMO_LAB_DIR"):
        return Path(os.environ["DEMO_LAB_DIR"]).resolve()
    for candidate in [
        Path.cwd() / "demo_lab",
        Path("/app/demo_lab"),
        Path(__file__).resolve().parent.parent.parent.parent.parent / "demo_lab",
        Path(__file__).resolve().parent.parent.parent / "demo_lab",
    ]:
        if candidate.exists():
            return candidate.resolve()
    return (Path.cwd() / "demo_lab").resolve()


def perform_full_clean(db: Session):
    """
    Purges all platform records in relational dependency order
    and resets the target security lab files to their initial vulnerable state.
    """
    counts = {
        "verifications": db.query(VerificationRun).count(),
        "remediations": db.query(RemediationRun).count(),
        "evidence": db.query(Evidence).count(),
        "findings": db.query(Finding).count(),
        "attack_paths": db.query(AttackPath).count(),
        "investigation_steps": db.query(InvestigationStep).count(),
        "tool_runs": db.query(ToolRun).count(),
        "investigations": db.query(Investigation).count(),
        "audit_events": db.query(AuditEvent).count(),
        "policies": db.query(Policy).count(),
        "workspaces": db.query(Workspace).count(),
        "lab_files_reset": False,
    }

    # Cascade deletion across all tables
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
    db.query(Workspace).delete()
    db.commit()

    # Reset security lab target files
    lab_dir = get_lab_dir()
    reset_script = lab_dir / "reset.py"
    if reset_script.exists():
        try:
            res = subprocess.run(
                ["python3", str(reset_script)],
                cwd=str(lab_dir),
                capture_output=True,
                text=True,
                timeout=15,
            )
            counts["lab_files_reset"] = (res.returncode == 0)
        except Exception:
            counts["lab_files_reset"] = False

    return counts


@router.post("/clean", status_code=status.HTTP_200_OK)
def clean_platform(db: Session = Depends(get_db)):
    """
    Comprehensive platform clean endpoint.
    Purges all workspaces, findings, investigations, attack paths, and audit events.
    Restores target security lab files to clean initial state.
    """
    counts = perform_full_clean(db)
    return {
        "status": "success",
        "message": "SentinelOS platform fully cleaned and reset to pristine state.",
        "cleaned_records": counts,
    }


@router.post("/reset", status_code=status.HTTP_200_OK)
def reset_platform(db: Session = Depends(get_db)):
    """Alias for /clean."""
    return clean_platform(db)


@router.get("/status", status_code=status.HTTP_200_OK)
def system_status(db: Session = Depends(get_db)):
    """Returns database record counts and storage health."""
    return {
        "status": "operational",
        "database_records": {
            "workspaces": db.query(Workspace).count(),
            "investigations": db.query(Investigation).count(),
            "findings": db.query(Finding).count(),
            "attack_paths": db.query(AttackPath).count(),
            "audit_events": db.query(AuditEvent).count(),
        },
    }

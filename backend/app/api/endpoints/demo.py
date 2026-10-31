import os
import subprocess
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.db.models import Workspace, Policy
from app.core.policy_engine import PolicyEngine
from app.core.audit_service import AuditService

router = APIRouter(prefix="/demo", tags=["SentinelOS Security Lab Demo"])


def get_demo_lab_dir() -> Path:
    if os.environ.get("DEMO_LAB_DIR"):
        return Path(os.environ["DEMO_LAB_DIR"]).resolve()
    for candidate in [
        Path.cwd() / "demo_lab",
        Path(__file__).resolve().parent.parent.parent.parent.parent / "demo_lab",
        Path(__file__).resolve().parent.parent.parent / "demo_lab",
        Path("/app/demo_lab"),
    ]:
        if candidate.exists():
            return candidate.resolve()
    return (Path(__file__).resolve().parent.parent.parent.parent.parent / "demo_lab").resolve()



@router.post("/setup")
def setup_demo_workspace(db: Session = Depends(get_db)):
    demo_dir = get_demo_lab_dir().resolve()
    if not demo_dir.exists():
        demo_dir.mkdir(parents=True, exist_ok=True)

    # Make sure demo reset script is run to populate vulnerable files
    reset_script = demo_dir / "reset.py"
    if reset_script.exists():
        subprocess.run(["python3", str(reset_script)], cwd=str(demo_dir), capture_output=True)

    canonical_str = str(demo_dir)
    workspace = db.query(Workspace).filter(Workspace.canonical_path == canonical_str).first()
    if not workspace:
        workspace = Workspace(
            display_name="SentinelOS Security Lab",
            canonical_path=canonical_str,
            project_type="python/fastapi",
            protected_paths=[".env", "config.py", "protected_admin_keys.json"],
            excluded_paths=[".git", ".venv", "__pycache__"],
            enabled_checks=["secrets", "sast", "dependencies", "prompt_shield"]
        )
        db.add(workspace)
        db.commit()
        db.refresh(workspace)

        policy = Policy(
            workspace_id=workspace.id,
            name="Shield Mode (Security Lab Strict)",
            description="Active Shield Mode blocking path traversal and unauthorized writes to sensitive project assets.",
            mode="shield",
            blocked_tools=["unauthorized_exec"],
            blocked_patterns=[".env", "protected_admin_keys.json", "id_rsa*"],
            allowed_write_paths=[canonical_str],
            require_approval_tools=["destructive_cleaner"]
        )
        db.add(policy)
        db.commit()

    return {
        "status": "ready",
        "workspace_id": workspace.id,
        "workspace_name": workspace.display_name,
        "canonical_path": canonical_str
    }


@router.post("/reset")
def reset_demo_lab():
    demo_dir = get_demo_lab_dir().resolve()
    reset_script = demo_dir / "reset.py"
    if reset_script.exists():
        res = subprocess.run(["python3", str(reset_script)], cwd=str(demo_dir), capture_output=True, text=True)
        return {"status": "reset_complete", "output": res.stdout}
    return {"status": "error", "message": "reset.py not found"}


@router.post("/trigger-policy-violation")
def trigger_policy_violation(db: Session = Depends(get_db)):
    """
    Scenario E: Trigger a controlled policy denial.
    Attempts to write to protected_admin_keys.json through SentinelOS execution path.
    The policy engine independently evaluates and blocks the action.
    """
    demo_dir = get_demo_lab_dir().resolve()
    workspace = db.query(Workspace).filter(Workspace.canonical_path == str(demo_dir)).first()
    if not workspace:
        raise HTTPException(status_code=404, detail="Demo workspace not initialized. Run /api/demo/setup first.")

    target_file = str(demo_dir / "protected_admin_keys.json")
    result = PolicyEngine.evaluate_action(
        db=db,
        workspace_id=workspace.id,
        tool_name="agent_file_writer",
        target_path=target_file,
        action_type="write",
        command_arguments={"operation": "overwrite", "content": "MALICIOUS_OVERWRITE"}
    )

    return {
        "scenario": "Scenario E: Policy Enforcement Demonstration",
        "target": target_file,
        "decision": result.decision,
        "reason": result.reason,
        "risk_level": result.risk_level,
        "violated_rule": result.violated_rule,
        "verified_blocked": (result.decision == "DENY")
    }

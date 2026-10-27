import pytest
import asyncio
import subprocess
from pathlib import Path
from app.db.session import SessionLocal, Base, engine, init_db
from app.db.models import Workspace, Investigation, Finding, AttackPath
from app.core.orchestrator import SentinelOrchestrator


@pytest.fixture
def clean_demo():
    p = (Path(__file__).parent.parent.parent / "demo_lab").resolve()
    subprocess.run(["python3", str(p / "reset.py")], cwd=str(p), capture_output=True)
    yield p
    subprocess.run(["python3", str(p / "reset.py")], cwd=str(p), capture_output=True)


@pytest.mark.asyncio
async def test_autonomous_investigation_workflow(clean_demo):
    init_db()
    db = SessionLocal()
    try:
        ws = db.query(Workspace).filter(Workspace.canonical_path == str(clean_demo)).first()
        if not ws:
            ws = Workspace(
                display_name="Demo Lab for Orchestrator Test",
                canonical_path=str(clean_demo),
                protected_paths=[".env"]
            )
            db.add(ws)
            db.commit()

        inv = Investigation(
            workspace_id=ws.id,
            goal="Test Autonomous Investigation Multi-step Flow",
            status="pending"
        )
        db.add(inv)
        db.commit()

        # Run orchestrator
        await SentinelOrchestrator.run_investigation_async(inv.id)

        # Refresh from database
        db.refresh(inv)
        assert inv.status == "completed", f"Investigation failed with error: {inv.error_message}"
        assert len(inv.summary) > 0
        assert inv.completed_at is not None

        # Check that steps were recorded
        assert len(inv.steps) >= 3

        # Check that findings were created
        findings = db.query(Finding).filter(Finding.investigation_id == inv.id).all()
        assert len(findings) >= 1

        # Check that attack paths were modeled
        paths = db.query(AttackPath).filter(AttackPath.investigation_id == inv.id).all()
        assert len(paths) >= 1
        assert len(paths[0].nodes) >= 2
        assert len(paths[0].edges) >= 1

    finally:
        db.close()

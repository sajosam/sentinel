import pytest
import subprocess
from pathlib import Path
from app.db.session import SessionLocal, Base, engine
from app.db.models import Workspace, Finding
from app.core.verification_engine import VerificationEngine


@pytest.fixture
def clean_demo():
    p = (Path(__file__).parent.parent.parent / "demo_lab").resolve()
    subprocess.run(["python3", str(p / "reset.py")], cwd=str(p), capture_output=True)
    yield p
    subprocess.run(["python3", str(p / "reset.py")], cwd=str(p), capture_output=True)


def test_remediation_and_verification_workflow(clean_demo):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        ws = db.query(Workspace).filter(Workspace.canonical_path == str(clean_demo)).first()
        if not ws:
            ws = Workspace(
                display_name="Demo Lab for Remediation",
                canonical_path=str(clean_demo),
                protected_paths=[".env"]
            )
            db.add(ws)
            db.commit()

        # Create finding representing SQL Injection in app.py
        finding = Finding(
            workspace_id=ws.id,
            title="SQL Injection in Database Query Execution",
            category="sast",
            severity="HIGH",
            confidence="CONFIRMED",
            file_path="app.py",
            line_number=42,
            description="Dynamic query string concatenation in search_users",
            verification_status="unverified"
        )
        db.add(finding)
        db.commit()

        # 1. Propose remediation
        rem = VerificationEngine.propose_remediation(finding.id, db)
        assert rem.status == "proposed"
        assert "diff" in rem.proposed_patch or "SELECT" in rem.proposed_patch

        # 2. Apply patch
        applied_rem = VerificationEngine.apply_remediation(rem.id, db)
        assert applied_rem.status == "applied"
        assert applied_rem.backup_file_content is not None

        # Verify file content was actually modified safely
        with open(clean_demo / "app.py", "r") as f:
            content = f.read()
        assert "cursor.execute(query, (username,))" in content

        # 3. Verify fix (rerun scans and tests)
        ver_run = VerificationEngine.verify_fix(finding.id, db, remediation_id=rem.id)
        assert ver_run.status == "passed"
        assert finding.verification_status == "verified_fixed"

        # 4. Rollback
        reverted_rem = VerificationEngine.rollback_remediation(rem.id, db)
        assert reverted_rem.status == "reverted"
        with open(clean_demo / "app.py", "r") as f:
            content_after = f.read()
        assert f"SELECT * FROM users WHERE username = '{{username}}'" in content_after

    finally:
        db.close()

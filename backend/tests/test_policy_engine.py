import pytest
from pathlib import Path
from app.db.session import SessionLocal, Base, engine
from app.db.models import Workspace, Policy
from app.core.policy_engine import PolicyEngine


@pytest.fixture
def db_session():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()


def test_path_traversal_denied(db_session):
    demo_dir = Path(__file__).parent.parent.parent / "demo_lab"
    ws = db_session.query(Workspace).filter(Workspace.canonical_path == str(demo_dir.resolve())).first()
    if not ws:
        ws = Workspace(
            display_name="Demo Lab",
            canonical_path=str(demo_dir.resolve()),
            protected_paths=["config.py", "protected_admin_keys.json"]
        )
        db_session.add(ws)
        db_session.commit()

    # Attempt to access /etc/passwd or path outside workspace
    result = PolicyEngine.evaluate_action(
        db=db_session,
        workspace_id=ws.id,
        tool_name="secret_scan",
        target_path="/etc/passwd",
        action_type="read"
    )
    assert result.decision == "DENY"
    assert "outside permitted workspace" in result.reason or "outside workspace boundary" in result.reason
    assert result.violated_rule == "WORKSPACE_BOUNDARY_VIOLATION"


def test_protected_path_write_denied(db_session):
    demo_dir = Path(__file__).parent.parent.parent / "demo_lab"
    ws = db_session.query(Workspace).filter(Workspace.canonical_path == str(demo_dir.resolve())).first()

    # Attempt to write to protected_admin_keys.json (Scenario E)
    protected_file = str(demo_dir.resolve() / "protected_admin_keys.json")
    result = PolicyEngine.evaluate_action(
        db=db_session,
        workspace_id=ws.id,
        tool_name="file_writer",
        target_path=protected_file,
        action_type="write"
    )
    assert result.decision == "DENY"
    assert "Shield Mode Protection" in result.reason or "protected" in result.reason.lower()
    assert result.violated_rule == "PROTECTED_PATH_VIOLATION"


def test_permitted_action(db_session):
    demo_dir = Path(__file__).parent.parent.parent / "demo_lab"
    ws = db_session.query(Workspace).filter(Workspace.canonical_path == str(demo_dir.resolve())).first()

    allowed_file = str(demo_dir.resolve() / "app.py")
    result = PolicyEngine.evaluate_action(
        db=db_session,
        workspace_id=ws.id,
        tool_name="sast_scan",
        target_path=allowed_file,
        action_type="read"
    )
    assert result.decision == "ALLOW"

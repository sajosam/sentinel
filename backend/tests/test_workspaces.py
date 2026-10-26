import pytest
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.db.session import SessionLocal, Base, engine
from app.db.models import Workspace

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield


def test_create_workspace_valid():
    workspace_path = str(Path(__file__).parent.parent.parent / "demo_lab")
    resp = client.post("/api/workspaces", json={
        "display_name": "SentinelOS Security Lab",
        "canonical_path": workspace_path,
        "protected_paths": [".env", "config.py"],
        "excluded_paths": [".git"],
        "enabled_checks": ["secrets", "sast", "dependencies"]
    })
    assert resp.status_code in [200, 201]
    data = resp.json()
    assert data["canonical_path"] == str(Path(workspace_path).resolve())
    assert "id" in data


def test_create_workspace_invalid_path():
    resp = client.post("/api/workspaces", json={
        "display_name": "Nonexistent Workspace",
        "canonical_path": "/path/to/completely/nonexistent/directory/12345"
    })
    assert resp.status_code == 400
    assert "not a valid directory" in resp.json()["detail"]


def test_list_and_get_workspace():
    resp = client.get("/api/workspaces")
    assert resp.status_code == 200
    workspaces = resp.json()
    assert len(workspaces) >= 1
    w_id = workspaces[0]["id"]

    resp2 = client.get(f"/api/workspaces/{w_id}")
    assert resp2.status_code == 200
    assert resp2.json()["id"] == w_id

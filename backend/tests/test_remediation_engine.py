import uuid
from pathlib import Path
from types import SimpleNamespace
from app.db.session import SessionLocal, init_db
from app.db.models import Workspace, Finding
from app.core import verification_engine as ve
from app.core.verification_engine import VerificationEngine, NoAutomaticFixError


def test_apply_edits_rejects_unsafe_edits():
    src = "a = 1\nb = 2\nb = 2\n"
    assert VerificationEngine._apply_edits(src, [{"find": "a = 1", "replace": "a = 3"}]) == "a = 3\nb = 2\nb = 2\n"
    # ambiguous find
    assert VerificationEngine._apply_edits(src, [{"find": "b = 2", "replace": "b = 3"}]) is None
    # missing find
    assert VerificationEngine._apply_edits(src, [{"find": "c = 1", "replace": "c = 2"}]) is None
    # model saw redacted source
    assert VerificationEngine._apply_edits(src, [{"find": "a = 1", "replace": "a = [REDACTED_SECRET]"}]) is None
    assert VerificationEngine._apply_edits(src, []) is None


def test_rule_based_fixes():
    sql = (
        "def q(cur, name, role):\n"
        "    sql = f\"SELECT * FROM t WHERE name = '{name}' AND role = '{role}'\"\n"
        "    cur.execute(sql)\n"
    )
    fixed = VerificationEngine._fix_sql_fstring(sql)
    assert "cur.execute(sql, (name, role))" in fixed
    assert "{name}" not in fixed

    secret = "# cfg\nAPI_TOKEN = \"abc123\"\nNAME = \"x\"\n"
    fixed = VerificationEngine._fix_hardcoded_secret(secret, 2)
    assert fixed.startswith("import os\n")
    assert 'API_TOKEN = os.getenv("API_TOKEN", "")' in fixed
    assert 'NAME = "x"' in fixed

    finding = SimpleNamespace(
        title="Vulnerable Dependency: urllib3 Request Body Leakage",
        remediation="Upgrade urllib3 to >= 1.26.18 or >= 2.0.7.",
        description="",
    )
    fixed = VerificationEngine._fix_pinned_dependency("requests==2.31.0\nurllib3==1.26.5\n", finding)
    assert fixed == "requests==2.31.0\nurllib3==2.0.7\n"


def _finding(db, root: Path, **kw) -> Finding:
    ws = Workspace(display_name=f"Engine {uuid.uuid4().hex[:6]}", canonical_path=str(root.resolve()), protected_paths=[])
    db.add(ws)
    db.commit()
    f = Finding(workspace_id=ws.id, severity="HIGH", **kw)
    db.add(f)
    db.commit()
    return f


def test_model_patch_is_used_when_valid(tmp_path, monkeypatch):
    init_db()
    db = SessionLocal()
    try:
        (tmp_path / "svc.py").write_text("import os\n\ndef run(cmd):\n    os.system(cmd)\n")
        finding = _finding(db, tmp_path, title="Unsafe os.system shell execution", category="sast",
                           file_path="svc.py", line_number=4, rule_id="python.security.dangerous-code-execution")

        monkeypatch.setattr(ve.model_gateway, "is_configured", lambda: True)
        monkeypatch.setattr(ve.model_gateway, "generate_json", lambda *a, **k: {
            "_source": "model", "_model": "muse-code", "summary": "Use subprocess without shell",
            "edits": [{"find": "    os.system(cmd)", "replace": "    import subprocess\n    subprocess.run(cmd.split(), check=True)"}],
        })
        rem = VerificationEngine.propose_remediation(finding.id, db)
        assert rem.generated_by == "model:muse-code"
        assert "+    subprocess.run(cmd.split(), check=True)" in rem.proposed_patch
        assert rem.proposed_patch.startswith("--- a/svc.py")

        # Model output that breaks syntax is rejected; no rule-based fix exists for this finding
        monkeypatch.setattr(ve.model_gateway, "generate_json", lambda *a, **k: {
            "_source": "model", "_model": "muse-code",
            "edits": [{"find": "    os.system(cmd)", "replace": "    subprocess.run(("}],
        })
        try:
            VerificationEngine.propose_remediation(finding.id, db)
            assert False, "expected NoAutomaticFixError"
        except NoAutomaticFixError as e:
            assert "syntax" in str(e)
    finally:
        db.close()


def test_apply_refuses_when_file_drifted(tmp_path):
    init_db()
    db = SessionLocal()
    try:
        target = tmp_path / "config.py"
        target.write_text('SECRET_KEY = "abc"\n')
        finding = _finding(db, tmp_path, title="Hardcoded secret", category="secret", file_path="config.py", line_number=1)
        rem = VerificationEngine.propose_remediation(finding.id, db)
        assert rem.generated_by == "rule-based"

        target.write_text('SECRET_KEY = "changed"\n')
        try:
            VerificationEngine.apply_remediation(rem.id, db)
            assert False, "expected drift error"
        except ValueError as e:
            assert "changed since" in str(e)
        assert target.read_text() == 'SECRET_KEY = "changed"\n'
    finally:
        db.close()


def test_failing_test_parser():
    out = SimpleNamespace(raw_output=(
        "test_suite.py::test_a PASSED\n"
        "test_suite.py::test_b FAILED\n"
        "FAILED test_suite.py::test_c - AssertionError\n"
    ))
    assert VerificationEngine._failing_tests(out) == ["test_suite.py::test_b", "test_suite.py::test_c"]

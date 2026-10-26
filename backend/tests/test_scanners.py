import pytest
from pathlib import Path
from app.tools.secret_scanner import SecretScannerTool
from app.tools.code_analyzer import CodeAnalyzerTool
from app.tools.dependency_checker import DependencyCheckerTool
from app.tools.prompt_shield_tester import PromptShieldTesterTool


@pytest.fixture
def demo_lab_path():
    p = (Path(__file__).parent.parent.parent / "demo_lab").resolve()
    # Ensure demo files are reset to initial state
    import subprocess
    subprocess.run(["python3", str(p / "reset.py")], cwd=str(p), capture_output=True)
    return p


def test_secret_scanner_detects_demo_key(demo_lab_path):
    tool = SecretScannerTool()
    result = tool.execute(demo_lab_path, {})
    assert result.exit_code == 0 or len(result.structured_findings) > 0
    assert len(result.structured_findings) >= 1
    # Check that DEMO_API_KEY was caught
    found_key = any("config.py" in f.get("file_path", "") for f in result.structured_findings)
    assert found_key, "Secret scanner did not detect exposed credential in config.py"
    # Ensure raw secret is redacted in output
    for f in result.structured_findings:
        assert "NOT_A_REAL_KEY" not in f.get("evidence_snippet", "") or "[REDACTED_SECRET]" in f.get("evidence_snippet", "")


def test_code_analyzer_detects_sql_injection(demo_lab_path):
    tool = CodeAnalyzerTool()
    result = tool.execute(demo_lab_path, {})
    assert len(result.structured_findings) >= 1
    found_sqli = any("SQL Injection" in f.get("title", "") for f in result.structured_findings)
    assert found_sqli, "Code analyzer failed to detect SQL injection in demo_lab/app.py"


def test_dependency_checker_detects_vulnerable_package(demo_lab_path):
    tool = DependencyCheckerTool()
    result = tool.execute(demo_lab_path, {})
    assert len(result.structured_findings) >= 1
    found_urllib3 = any("urllib3" in f.get("title", "").lower() or "urllib3" in f.get("evidence_snippet", "").lower() for f in result.structured_findings)
    assert found_urllib3, "Dependency checker failed to detect vulnerable urllib3 in demo_lab/requirements.txt"


def test_prompt_shield_tester(demo_lab_path):
    tool = PromptShieldTesterTool()
    result = tool.execute(demo_lab_path, {})
    assert len(result.structured_findings) >= 1
    found_prompt_vuln = any("Prompt Shield Failure" in f.get("title", "") for f in result.structured_findings)
    assert found_prompt_vuln, "Prompt shield did not detect unhardened AI endpoint in demo_lab"

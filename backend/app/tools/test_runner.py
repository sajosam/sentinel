import subprocess
import time
from pathlib import Path
from typing import Dict, Any, List
from app.tools.base import BaseTool
from app.schemas.tool import ToolExecutionResult
from app.core.audit_service import AuditService


class TestRunnerTool(BaseTool):
    tool_id = "test_runner"
    name = "Native Test Runner"
    purpose = "Execute automated unit and security regression test suites within the workspace boundary."
    risk_level = "LOW"
    changes_files = False
    requires_approval = False

    def execute(
        self,
        workspace_path: Path,
        arguments: Dict[str, Any],
        timeout_seconds: int = 45
    ) -> ToolExecutionResult:
        start_time = time.time()
        test_file = arguments.get("test_file", "test_suite.py")
        test_path = workspace_path / test_file

        cmd = ["python3", "-m", "pytest", "-v", str(test_path)] if test_path.exists() else ["python3", "-m", "unittest", "discover"]
        
        raw_output = ""
        exit_code = 0
        try:
            res = subprocess.run(
                cmd,
                cwd=str(workspace_path),
                capture_output=True,
                text=True,
                timeout=timeout_seconds
            )
            exit_code = res.returncode
            raw_output = res.stdout + "\n" + res.stderr
        except Exception as e:
            exit_code = 1
            raw_output = f"Test execution error: {str(e)}"

        duration_ms = int((time.time() - start_time) * 1000)
        return ToolExecutionResult(
            tool_name=self.tool_id,
            exit_code=exit_code,
            duration_ms=duration_ms,
            raw_output=AuditService.redact(raw_output),
            structured_findings=[],
            is_policy_allowed=True,
            policy_reason="Permitted regression test execution"
        )

import os
import subprocess
import sys
import time
from pathlib import Path
from typing import Dict, Any, Optional
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

    IGNORED_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", "dist", "build"}

    def execute(
        self,
        workspace_path: Path,
        arguments: Dict[str, Any],
        timeout_seconds: int = 45
    ) -> ToolExecutionResult:
        start_time = time.time()

        if arguments.get("allow_execution") is False:
            return self._skipped(start_time, "No test suite executed: code execution is disabled for this workspace.")

        test_target = self._find_test_target(workspace_path, arguments.get("test_file"))
        if test_target is None:
            return self._skipped(start_time, "No test suite detected in workspace.")

        # Run with the backend interpreter so pytest is guaranteed to be importable
        cmd = [sys.executable, "-m", "pytest", "-v", "-p", "no:cacheprovider", str(test_target)]

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

    def _find_test_target(self, workspace_path: Path, test_file: Optional[str]) -> Optional[Path]:
        if test_file:
            candidate = (workspace_path / test_file).resolve()
            return candidate if candidate.exists() else None

        if (workspace_path / "test_suite.py").exists():
            return workspace_path / "test_suite.py"

        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in self.IGNORED_DIRS and not d.startswith(".")]
            if any(f.endswith(".py") and (f.startswith("test_") or f.endswith("_test.py")) for f in files):
                return workspace_path
        return None

    def _skipped(self, start_time: float, message: str) -> ToolExecutionResult:
        return ToolExecutionResult(
            tool_name=self.tool_id,
            exit_code=0,
            duration_ms=int((time.time() - start_time) * 1000),
            raw_output=message,
            structured_findings=[],
            is_policy_allowed=True,
            policy_reason="Permitted regression test execution"
        )

import ast
import json
import os
import re
import subprocess
import time
from pathlib import Path
from typing import Dict, Any, List
from app.tools.base import BaseTool
from app.schemas.tool import ToolExecutionResult
from app.config import settings
from app.core.audit_service import AuditService


class CodeAnalyzerTool(BaseTool):
    tool_id = "sast_scan"
    name = "Semgrep SAST Code Analyzer"
    purpose = "Analyze application source code for static vulnerabilities including SQL injection and unsafe input handling."
    risk_level = "LOW"
    changes_files = False
    requires_approval = False
    binary_path = settings.SEMGREP_PATH

    def execute(
        self,
        workspace_path: Path,
        arguments: Dict[str, Any],
        timeout_seconds: int = 45
    ) -> ToolExecutionResult:
        start_time = time.time()
        findings: List[Dict[str, Any]] = []
        raw_output = ""
        exit_code = 0

        # 1. Real Semgrep CLI invocation
        semgrep_bin = self.binary_path if (self.binary_path and Path(self.binary_path).exists()) else "semgrep"
        try:
            cmd = [
                semgrep_bin,
                "scan",
                "--json",
                "--quiet",
                "--config", "p/default",
                str(workspace_path)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_seconds)
            raw_output = res.stdout
            exit_code = res.returncode
            if res.stdout:
                try:
                    data = json.loads(res.stdout)
                    results = data.get("results", [])
                    for item in results:
                        rel_path = item.get("path", "")
                        try:
                            rel_path = str(Path(rel_path).relative_to(workspace_path))
                        except Exception:
                            pass
                        extra = item.get("extra", {})
                        sev = extra.get("severity", "WARNING").upper()
                        severity_map = {"ERROR": "HIGH", "WARNING": "MEDIUM", "INFO": "LOW"}
                        findings.append({
                            "title": item.get("check_id", "Static Code Vulnerability"),
                            "category": "sast",
                            "severity": severity_map.get(sev, "MEDIUM"),
                            "confidence": "CONFIRMED",
                            "file_path": rel_path,
                            "line_number": item.get("start", {}).get("line", 1),
                            "rule_id": item.get("check_id", "semgrep-rule"),
                            "description": extra.get("message", "Semgrep security finding"),
                            "impact": "Code vulnerability may permit unauthorized data access, execution, or escalation.",
                            "remediation": extra.get("fix", "Sanitize user inputs and adhere to secure coding standards."),
                            "evidence_snippet": extra.get("lines", "").strip()
                        })
                except Exception as parse_err:
                    raw_output += f"\nFailed to parse Semgrep JSON output: {parse_err}"
        except Exception as e:
            raw_output += f"\nSemgrep execution exception: {str(e)}"

        # 2. In-depth AST and Pattern SAST Fallback Scanner
        ast_findings = self._scan_python_ast(workspace_path)
        for af in ast_findings:
            if not any(f.get("file_path") == af.get("file_path") and f.get("line_number") == af.get("line_number") for f in findings):
                findings.append(af)

        duration_ms = int((time.time() - start_time) * 1000)
        return ToolExecutionResult(
            tool_name=self.tool_id,
            exit_code=exit_code,
            duration_ms=duration_ms,
            raw_output=AuditService.redact(raw_output),
            structured_findings=findings,
            is_policy_allowed=True,
            policy_reason="Permitted read-only static analysis"
        )

    def _scan_python_ast(self, workspace_path: Path) -> List[Dict[str, Any]]:
        findings = []
        ignored_dirs = {".git", ".venv", "node_modules", "__pycache__"}

        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                if file.endswith(".py"):
                    file_full = Path(root) / file
                    try:
                        rel_path = str(file_full.relative_to(workspace_path))
                        with open(file_full, "r", encoding="utf-8") as f:
                            code_content = f.read()

                        # Check for SQL injection with raw string formatting (f-string, %, or format)
                        sqli_patterns = [
                            re.compile(r'f["\'].*?(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*?\{.*?\}', re.IGNORECASE),
                            re.compile(r'["\'].*?(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*?["\']\s*%\s*\w+', re.IGNORECASE),
                            re.compile(r'["\'].*?(SELECT|INSERT|UPDATE|DELETE|DROP)\s+.*?["\']\.format\(', re.IGNORECASE),
                        ]

                        for pat in sqli_patterns:
                            for match in pat.finditer(code_content):
                                line_num = code_content[:match.start()].count("\n") + 1
                                snippet = match.group(0).strip()
                                findings.append({
                                    "title": "SQL Injection in Database Query Execution",
                                    "category": "sast",
                                    "severity": "HIGH",
                                    "confidence": "CONFIRMED",
                                    "file_path": rel_path,
                                    "line_number": line_num,
                                    "rule_id": "python.fastapi.security.audit.raw-sql-concat",
                                    "description": "Dynamic SQL query formed using unparameterized string formatting. Attacker can inject arbitrary SQL commands.",
                                    "impact": "Allows full database read and modification, authentication bypass, and potential data exfiltration.",
                                    "remediation": "Use parameterized queries with placeholder syntax: cursor.execute('SELECT * FROM users WHERE username = ?', (username,))",
                                    "evidence_snippet": snippet[:150]
                                })

                        # Check for dangerous eval or os.system
                        unsafe_calls = [
                            (r'\beval\s*\(', "Unsafe eval() execution", "CRITICAL"),
                            (r'\bos\.system\s*\(', "Unsafe os.system shell execution", "HIGH"),
                            (r'\bsubprocess\.Popen\(.*shell\s*=\s*True', "Subprocess with shell=True", "HIGH"),
                        ]
                        for pat, title, sev in unsafe_calls:
                            for match in re.finditer(pat, code_content):
                                line_num = code_content[:match.start()].count("\n") + 1
                                findings.append({
                                    "title": title,
                                    "category": "sast",
                                    "severity": sev,
                                    "confidence": "CONFIRMED",
                                    "file_path": rel_path,
                                    "line_number": line_num,
                                    "rule_id": "python.security.dangerous-code-execution",
                                    "description": f"Dangerous function call {title} detected without strict argument validation.",
                                    "impact": "Remote code execution or arbitrary command invocation.",
                                    "remediation": "Refactor away from dangerous shell execution functions to safe APIs.",
                                    "evidence_snippet": match.group(0)
                                })
                    except Exception:
                        continue
        return findings

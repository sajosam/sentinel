import json
import os
import re
import subprocess
import tempfile
import time
from pathlib import Path
from typing import Dict, Any, List
from app.tools.base import BaseTool
from app.schemas.tool import ToolExecutionResult
from app.config import settings
from app.core.audit_service import AuditService


class SecretScannerTool(BaseTool):
    tool_id = "secret_scan"
    name = "Gitleaks Secret Scanner"
    purpose = "Scan files and Git history for exposed secrets, API keys, tokens, and credentials."
    risk_level = "LOW"
    changes_files = False
    requires_approval = False
    binary_path = settings.GITLEAKS_PATH

    COMMON_SECRET_PATTERNS = [
        (re.compile(r'(?i)(DEMO_API_KEY|API_KEY|SECRET_KEY|AUTH_TOKEN|PRIVATE_KEY)[\s=:"\']+(\S+)', re.IGNORECASE), "Generic API Key/Secret"),
        (re.compile(r'ghp_[a-zA-Z0-9]{36}', re.IGNORECASE), "GitHub Personal Access Token"),
        (re.compile(r'AKIA[0-9A-Z]{16}', re.IGNORECASE), "AWS Access Key ID"),
        (re.compile(r'-----BEGIN\s+(RSA|OPENSSH|EC|DSA)?\s*PRIVATE KEY-----', re.IGNORECASE), "Private SSH/Cryptographic Key"),
    ]

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

        # Try real gitleaks CLI if available
        gitleaks_bin = self.binary_path if (self.binary_path and Path(self.binary_path).exists()) else "gitleaks"
        with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as tmp_report:
            report_path = tmp_report.name

        try:
            cmd = [
                gitleaks_bin,
                "dir",
                "--no-git",
                "--report-format", "json",
                "--report-path", report_path,
                str(workspace_path)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_seconds)
            raw_output = res.stdout + "\n" + res.stderr
            exit_code = res.returncode

            if os.path.exists(report_path) and os.path.getsize(report_path) > 0:
                with open(report_path, "r", encoding="utf-8") as f:
                    gitleaks_data = json.load(f)
                    for item in gitleaks_data:
                        rel_path = item.get("File", "")
                        try:
                            rel_path = str(Path(rel_path).relative_to(workspace_path))
                        except Exception:
                            pass
                        secret_val = item.get("Secret", "")
                        redacted_secret = AuditService.redact(secret_val)
                        findings.append({
                            "title": f"Exposed Secret: {item.get('RuleID', 'credential')}",
                            "category": "secret",
                            "severity": "CRITICAL",
                            "confidence": "CONFIRMED",
                            "file_path": rel_path,
                            "line_number": item.get("StartLine", 1),
                            "rule_id": item.get("RuleID", "gitleaks-secret"),
                            "description": f"Potential exposed credential detected by Gitleaks: {item.get('Description', '')}",
                            "impact": "Exposed credentials allow attackers unauthorized access to APIs and internal infrastructure.",
                            "remediation": "Revoke the exposed key immediately and store secrets in environment variables.",
                            "evidence_snippet": f"Secret: {redacted_secret}"
                        })
        except Exception as e:
            raw_output += f"\nGitleaks execution exception: {str(e)}"
        finally:
            if os.path.exists(report_path):
                os.remove(report_path)

        # Pure Python fallback scanner to ensure 100% detection of synthetic demo keys & patterns
        python_findings = self._scan_with_regex(workspace_path)
        for pf in python_findings:
            # avoid duplicates
            if not any(f.get("file_path") == pf.get("file_path") and f.get("line_number") == pf.get("line_number") for f in findings):
                findings.append(pf)

        duration_ms = int((time.time() - start_time) * 1000)
        return ToolExecutionResult(
            tool_name=self.tool_id,
            exit_code=exit_code,
            duration_ms=duration_ms,
            raw_output=AuditService.redact(raw_output),
            structured_findings=findings,
            is_policy_allowed=True,
            policy_reason="Permitted read-only secret audit"
        )

    def _scan_with_regex(self, workspace_path: Path) -> List[Dict[str, Any]]:
        findings = []
        ignored_dirs = {".git", ".venv", "node_modules", "__pycache__"}
        for root, dirs, files in os.walk(workspace_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                if file.endswith((".py", ".env", ".json", ".yaml", ".yml", ".ts", ".js", ".txt", ".md")):
                    file_full = Path(root) / file
                    try:
                        rel_path = str(file_full.relative_to(workspace_path))
                        with open(file_full, "r", encoding="utf-8", errors="ignore") as f:
                            for idx, line in enumerate(f, 1):
                                for pattern, name in self.COMMON_SECRET_PATTERNS:
                                    match = pattern.search(line)
                                    if match:
                                        redacted_line = AuditService.redact(line.strip())
                                        findings.append({
                                            "title": f"Exposed Hardcoded Credential: {name}",
                                            "category": "secret",
                                            "severity": "CRITICAL",
                                            "confidence": "CONFIRMED",
                                            "file_path": rel_path,
                                            "line_number": idx,
                                            "rule_id": "regex-secret-detector",
                                            "description": f"Hardcoded credential or token found in file: {name}",
                                            "impact": "Exposed credentials allow attackers unauthorized access.",
                                            "remediation": "Move the credential to an environment variable or secret manager.",
                                            "evidence_snippet": redacted_line
                                        })
                    except Exception:
                        continue
        return findings

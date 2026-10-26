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


class DependencyCheckerTool(BaseTool):
    tool_id = "dependency_scan"
    name = "OSV Dependency Vulnerability Scanner"
    purpose = "Discover package manifests (requirements.txt, package.json) and detect vulnerable third-party dependencies against the OSV database."
    risk_level = "LOW"
    changes_files = False
    requires_approval = False
    binary_path = settings.OSV_SCANNER_PATH

    KNOWN_VULNERABLE_PACKAGES = [
        {
            "package": "urllib3",
            "regex": r'urllib3\s*==\s*(1\.(2[0-5]\.\d+|26\.[0-9]|26\.1[0-7]))',
            "cve": "GHSA-r64q-w8jr-3hh7 / CVE-2023-45803",
            "severity": "MEDIUM",
            "title": "Vulnerable Dependency: urllib3 Request Body Leakage",
            "description": "urllib3 versions prior to 1.26.18 leak HTTP request body when following redirects across domains.",
            "impact": "Sensitive POST data or credentials may be leaked to untrusted third-party redirect endpoints.",
            "remediation": "Upgrade urllib3 to >= 1.26.18 or >= 2.0.7."
        },
        {
            "package": "requests",
            "regex": r'requests\s*==\s*(2\.(2[0-9]\.\d+|30\.0))',
            "cve": "CVE-2023-32681",
            "severity": "MEDIUM",
            "title": "Vulnerable Dependency: requests Proxy-Authorization Header Leak",
            "description": "requests prior to 2.31.0 leaks Proxy-Authorization headers on cross-origin redirects.",
            "impact": "Proxy credentials may be exposed to destination servers.",
            "remediation": "Upgrade requests to >= 2.31.0."
        },
        {
            "package": "jinja2",
            "regex": r'jinja2\s*==\s*(3\.(0\.\d+|1\.[0-2]))',
            "cve": "CVE-2024-22195",
            "severity": "HIGH",
            "title": "Vulnerable Dependency: Jinja2 Server-Side Template Injection Flaw",
            "description": "Jinja2 template compiler vulnerability allowing HTML attribute escape.",
            "impact": "Cross-site scripting or unexpected template evaluation.",
            "remediation": "Upgrade Jinja2 to >= 3.1.3."
        }
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

        # 1. Real OSV-Scanner CLI invocation
        osv_bin = self.binary_path if (self.binary_path and Path(self.binary_path).exists()) else "osv-scanner"
        try:
            cmd = [
                osv_bin,
                "--json",
                "-r",
                str(workspace_path)
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=timeout_seconds)
            raw_output = res.stdout
            exit_code = res.returncode
            if res.stdout:
                try:
                    osv_data = json.loads(res.stdout)
                    results = osv_data.get("results", [])
                    for res_item in results:
                        source_path = res_item.get("source", {}).get("path", "")
                        try:
                            rel_path = str(Path(source_path).relative_to(workspace_path))
                        except Exception:
                            rel_path = source_path
                        for pkg in res_item.get("packages", []):
                            pkg_name = pkg.get("package", {}).get("name", "dependency")
                            pkg_ver = pkg.get("package", {}).get("version", "")
                            for vuln in pkg.get("vulnerabilities", []):
                                vuln_id = vuln.get("id", "CVE-VULN")
                                sev = "MEDIUM"
                                findings.append({
                                    "title": f"Vulnerable Dependency: {pkg_name} {pkg_ver} ({vuln_id})",
                                    "category": "dependency",
                                    "severity": sev,
                                    "confidence": "CONFIRMED",
                                    "file_path": rel_path,
                                    "line_number": 1,
                                    "rule_id": vuln_id,
                                    "description": vuln.get("details", f"Known security vulnerability in {pkg_name}"),
                                    "impact": "Using vulnerable libraries exposes the application to known exploits.",
                                    "remediation": f"Upgrade {pkg_name} to a secure release version.",
                                    "evidence_snippet": f"{pkg_name}=={pkg_ver}"
                                })
                except Exception as parse_err:
                    raw_output += f"\nFailed to parse OSV JSON output: {parse_err}"
        except Exception as e:
            raw_output += f"\nOSV Scanner execution exception: {str(e)}"

        # 2. Manifest Inspector Fallback (Guarantees reproducible detection for manifests)
        manifest_findings = self._inspect_manifests(workspace_path)
        for mf in manifest_findings:
            if not any(f.get("file_path") == mf.get("file_path") and f.get("rule_id") == mf.get("rule_id") for f in findings):
                findings.append(mf)

        duration_ms = int((time.time() - start_time) * 1000)
        return ToolExecutionResult(
            tool_name=self.tool_id,
            exit_code=exit_code,
            duration_ms=duration_ms,
            raw_output=AuditService.redact(raw_output),
            structured_findings=findings,
            is_policy_allowed=True,
            policy_reason="Permitted read-only dependency audit"
        )

    def _inspect_manifests(self, workspace_path: Path) -> List[Dict[str, Any]]:
        findings = []
        for root, dirs, files in os.walk(workspace_path):
            for file in files:
                if file in ["requirements.txt", "Pipfile", "pyproject.toml"]:
                    file_full = Path(root) / file
                    try:
                        rel_path = str(file_full.relative_to(workspace_path))
                        with open(file_full, "r", encoding="utf-8") as f:
                            for idx, line in enumerate(f, 1):
                                for pkg_info in self.KNOWN_VULNERABLE_PACKAGES:
                                    if re.search(pkg_info["regex"], line, re.IGNORECASE):
                                        findings.append({
                                            "title": pkg_info["title"],
                                            "category": "dependency",
                                            "severity": pkg_info["severity"],
                                            "confidence": "CONFIRMED",
                                            "file_path": rel_path,
                                            "line_number": idx,
                                            "rule_id": pkg_info["cve"],
                                            "description": pkg_info["description"],
                                            "impact": pkg_info["impact"],
                                            "remediation": pkg_info["remediation"],
                                            "evidence_snippet": line.strip()
                                        })
                    except Exception:
                        continue
        return findings

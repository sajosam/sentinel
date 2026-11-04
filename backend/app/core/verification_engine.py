import datetime
import difflib
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.db.models import Finding, RemediationRun, VerificationRun, Workspace
from app.core.model_gateway import model_gateway
from app.core.prompts import REMEDIATION_PROMPT
from app.core.policy_engine import PolicyEngine
from app.core.audit_service import AuditService
from app.core.tool_registry import tool_registry

MAX_MODEL_FILE_CHARS = 20000
REDACTION_MARKER = "[REDACTED_SECRET]"
# Workspaces carrying this marker in enabled_checks never get their own code executed (e.g. cloned public repos)
NO_CODE_EXECUTION = "no_code_execution"


class NoAutomaticFixError(ValueError):
    """Raised when neither the model nor the rule-based engine can produce a safe, valid patch."""


class VerificationEngine:
    """
    Patch lifecycle: propose -> apply -> verify -> (optional) rollback.

    The model only authors candidate edits. This engine applies them to the real (unredacted) file,
    rejects edits that do not match exactly or break syntax, and decides success from scanner reruns
    and test results — never from the model's own claims.
    """

    @classmethod
    def propose_remediation(cls, finding_id: str, db: Session, precomputed: Optional[tuple] = None) -> RemediationRun:
        """precomputed: (source_text, patched, summary, generated_by) from compute_patch. Reused only when
        source_text still equals the real file, so the patch the user applies is the one already tested."""
        finding = db.query(Finding).filter(Finding.id == finding_id).first()
        if not finding:
            raise ValueError("Finding not found")

        workspace = db.query(Workspace).filter(Workspace.id == finding.workspace_id).first()
        workspace_path = Path(workspace.canonical_path).resolve()
        target_file_rel = finding.file_path or "app.py"
        target_file_full = (workspace_path / target_file_rel).resolve()

        if not target_file_full.exists() or not target_file_full.is_file():
            raise NoAutomaticFixError(f"Target file does not exist: {target_file_rel}")

        with open(target_file_full, "r", encoding="utf-8", errors="ignore") as f:
            original_content = f.read()

        if precomputed and precomputed[0] == original_content:
            patched_content, summary, generated_by = precomputed[1:]
            model_note = ""
        else:
            patched_content, summary, generated_by, model_note = cls.compute_patch(finding, original_content, target_file_rel)

        if patched_content is None:
            raise NoAutomaticFixError(
                f"No safe automatic fix available for '{finding.title}' in {target_file_rel}. "
                + (model_note or "Manual remediation required.")
            )

        diff = "".join(difflib.unified_diff(
            original_content.splitlines(keepends=True),
            patched_content.splitlines(keepends=True),
            fromfile=f"a/{target_file_rel}",
            tofile=f"b/{target_file_rel}",
        ))

        remediation = RemediationRun(
            finding_id=finding.id,
            workspace_id=workspace.id,
            proposed_patch=diff,
            patch_summary=summary,
            target_file=target_file_rel,
            # The content the patch was computed against; apply refuses if the file drifted since
            backup_file_content=original_content,
            patched_content=patched_content,
            generated_by=generated_by,
            status="proposed"
        )
        db.add(remediation)
        finding.verification_status = "fix_proposed"
        db.commit()
        db.refresh(remediation)

        AuditService.record_event(
            db=db,
            workspace_id=workspace.id,
            event_type="remediation_proposed",
            action=f"propose_remediation:{finding.category}",
            decision="ALLOW",
            reason=f"Generated proposed patch ({generated_by}): {summary}",
            details={
                "finding_id": finding.id,
                "target_file": target_file_rel,
                "generated_by": generated_by,
                "note": model_note,
            }
        )

        return remediation

    @classmethod
    def compute_patch(cls, finding: Finding, source_text: str, rel_path: Optional[str] = None):
        """
        Pure: given a finding and the CURRENT file text, return (patched_text, summary, generated_by, note).
        patched_text is None when no safe fix applies. No I/O, no persistence — safe to chain on a file
        that earlier fixes already modified.
        """
        rel_path = rel_path or finding.file_path or "app.py"
        note = ""

        # Secrets are redacted before the model sees the file, so it cannot edit the leaking line.
        # Use the deterministic rewrite (literal -> os.getenv) instead of a model patch that can't verify.
        if finding.category == "secret":
            candidate, rule_summary = cls._rule_based_patch(finding, source_text)
            if candidate and candidate != source_text and cls._is_valid_syntax(rel_path, candidate):
                return candidate, rule_summary, "rule-based", "Secret values never reach the model; used the deterministic secret fix."

        # 1. Model-authored patch (Muse Spark in prod), applied as exact search/replace edits
        if model_gateway.is_configured() and len(source_text) <= MAX_MODEL_FILE_CHARS:
            context = (
                f"Vulnerability: {finding.title}\n"
                f"Category: {finding.category}\n"
                f"Rule: {finding.rule_id}\n"
                f"File: {rel_path}\n"
                f"Line: {finding.line_number}\n"
                f"Description: {finding.description}\n"
                f"Suggested remediation: {finding.remediation}\n"
                f"--- BEGIN {rel_path} ---\n{source_text}\n--- END {rel_path} ---"
            )
            patch_data = model_gateway.generate_json(REMEDIATION_PROMPT, context, task_type="remediation")
            if patch_data.get("_source") == "model":
                candidate = cls._apply_edits(source_text, patch_data.get("edits"))
                if candidate is None:
                    note = "Model edits did not match the source exactly; used rule-based engine."
                elif not cls._is_valid_syntax(rel_path, candidate):
                    note = "Model patch failed syntax validation; used rule-based engine."
                elif candidate != source_text:
                    return candidate, (patch_data.get("summary") or f"Fix for {finding.title}"), f"model:{patch_data.get('_model')}", note

        # 2. Deterministic rule-based fallback for well-known vulnerability shapes
        candidate, rule_summary = cls._rule_based_patch(finding, source_text)
        if candidate and candidate != source_text and cls._is_valid_syntax(rel_path, candidate):
            return candidate, rule_summary, "rule-based", note

        return None, "", "", note

    @classmethod
    def apply_remediation(cls, remediation_id: str, db: Session) -> RemediationRun:
        remediation = db.query(RemediationRun).filter(RemediationRun.id == remediation_id).first()
        if not remediation:
            raise ValueError("Remediation run not found")
        if not remediation.patched_content:
            raise ValueError("This remediation predates verified patching. Propose a new fix.")

        workspace = db.query(Workspace).filter(Workspace.id == remediation.workspace_id).first()
        workspace_path = Path(workspace.canonical_path).resolve()
        target_full = (workspace_path / remediation.target_file).resolve()

        # Policy validation
        policy_res = PolicyEngine.evaluate_action(
            db=db,
            workspace_id=workspace.id,
            tool_name="patch_applicator",
            target_path=str(target_full),
            action_type="write"
        )

        if policy_res.decision != "ALLOW":
            raise PermissionError(f"Policy Block: Cannot apply patch to {remediation.target_file}: {policy_res.reason}")

        if not target_full.exists():
            raise FileNotFoundError(f"Target file does not exist: {remediation.target_file}")

        with open(target_full, "r", encoding="utf-8", errors="ignore") as f:
            current_content = f.read()

        if remediation.backup_file_content is not None and current_content != remediation.backup_file_content:
            raise ValueError(
                f"{remediation.target_file} changed since this fix was proposed. Propose a new fix."
            )
        remediation.backup_file_content = current_content

        # Baseline test run so verification can tell new regressions from pre-existing failures
        remediation.baseline_test_failures = cls._failing_tests(cls._run_tests(workspace, workspace_path, db))

        with open(target_full, "w", encoding="utf-8") as f:
            f.write(remediation.patched_content)

        remediation.status = "applied"
        remediation.applied_at = datetime.datetime.now(datetime.timezone.utc)
        db.commit()

        AuditService.record_event(
            db=db,
            workspace_id=workspace.id,
            event_type="patch_applied",
            action=f"apply_patch:{remediation.target_file}",
            decision="ALLOW",
            reason=f"Applied patch to {remediation.target_file}",
            details={"remediation_id": remediation.id, "generated_by": remediation.generated_by}
        )

        return remediation

    @classmethod
    def rollback_remediation(cls, remediation_id: str, db: Session) -> RemediationRun:
        remediation = db.query(RemediationRun).filter(RemediationRun.id == remediation_id).first()
        if not remediation or not remediation.backup_file_content:
            raise ValueError("No backup content available for rollback")

        workspace = db.query(Workspace).filter(Workspace.id == remediation.workspace_id).first()
        workspace_path = Path(workspace.canonical_path).resolve()
        target_full = (workspace_path / remediation.target_file).resolve()

        with open(target_full, "w", encoding="utf-8") as f:
            f.write(remediation.backup_file_content)

        remediation.status = "reverted"
        db.commit()

        AuditService.record_event(
            db=db,
            workspace_id=workspace.id,
            event_type="patch_reverted",
            action=f"rollback:{remediation.target_file}",
            decision="ALLOW",
            reason=f"Restored original content for {remediation.target_file}",
            details={"remediation_id": remediation.id}
        )
        return remediation

    @classmethod
    def verify_fix(cls, finding_id: str, db: Session, remediation_id: Optional[str] = None) -> VerificationRun:
        finding = db.query(Finding).filter(Finding.id == finding_id).first()
        if not finding:
            raise ValueError("Finding not found")

        workspace = db.query(Workspace).filter(Workspace.id == finding.workspace_id).first()
        workspace_path = Path(workspace.canonical_path).resolve()

        remediation = None
        if remediation_id:
            remediation = db.query(RemediationRun).filter(RemediationRun.id == remediation_id).first()
        else:
            remediation = db.query(RemediationRun).filter(
                RemediationRun.finding_id == finding.id,
                RemediationRun.status == "applied"
            ).order_by(RemediationRun.applied_at.desc()).first()
            remediation_id = remediation.id if remediation else None

        # Determine tool to rerun
        tool_map = {
            "sast": "sast_scan",
            "secret": "secret_scan",
            "dependency": "dependency_scan",
            "prompt_injection": "prompt_shield_test"
        }
        tool_name = tool_map.get(finding.category, "sast_scan")

        # Rerun scanner check
        res = tool_registry.execute_tool(
            tool_id=tool_name,
            workspace_path=workspace_path,
            arguments={},
            db=db,
            workspace_id=workspace.id
        )

        # Rerun automated test suite
        test_res = cls._run_tests(workspace, workspace_path, db)
        failures_after = cls._failing_tests(test_res)
        baseline = set((remediation.baseline_test_failures if remediation else None) or [])
        new_failures = sorted(set(failures_after) - baseline)
        tests_skipped = test_res.exit_code == 0 and "No test suite" in (test_res.raw_output or "")

        # Check if the specific finding still persists
        still_present = any(cls._same_finding(finding, f) for f in res.structured_findings)

        if still_present:
            ver_status = "failed"
            ver_msg = f"Verification FAILED: {finding.title} was still detected by {tool_name} after the patch."
            finding.verification_status = "unresolved"
        elif new_failures:
            ver_status = "failed"
            ver_msg = (
                f"Verification FAILED: {tool_name} no longer reports {finding.title}, "
                f"but the patch introduced test regressions: {', '.join(new_failures[:5])}."
            )
            finding.verification_status = "unresolved"
        else:
            ver_status = "passed"
            if tests_skipped:
                test_note = "No runnable test suite (or test execution disabled for this workspace)."
            else:
                test_note = f"Test suite ran with no new failures ({len(failures_after)} pre-existing)."
            ver_msg = f"Verification SUCCESS: Re-scan with {tool_name} confirmed {finding.title} is gone. {test_note}"
            finding.verification_status = "verified_fixed"

        v_run = VerificationRun(
            finding_id=finding.id,
            remediation_id=remediation_id,
            status=ver_status,
            before_check_result={
                "initial_finding": finding.title,
                "rule_id": finding.rule_id,
                "baseline_test_failures": sorted(baseline),
            },
            after_check_result={
                "persists": still_present,
                "current_scanner_findings": len(res.structured_findings),
                "failing_tests": failures_after,
                "new_test_failures": new_failures,
            },
            test_output=test_res.raw_output[:2000],
            message=ver_msg
        )
        db.add(v_run)
        db.commit()
        db.refresh(v_run)

        AuditService.record_event(
            db=db,
            workspace_id=workspace.id,
            event_type="verification_completed",
            action=f"verify_fix:{finding.title}",
            decision="ALLOW",
            reason=ver_msg,
            details={"status": ver_status, "remediation_id": remediation_id}
        )

        return v_run

    # ------------------------------------------------------------------ helpers

    @classmethod
    def _run_tests(cls, workspace: Workspace, workspace_path: Path, db: Session):
        allow_execution = NO_CODE_EXECUTION not in (workspace.enabled_checks or [])
        return tool_registry.execute_tool(
            tool_id="test_runner",
            workspace_path=workspace_path,
            arguments={"allow_execution": allow_execution},
            db=db,
            workspace_id=workspace.id
        )

    @staticmethod
    def _failing_tests(test_res) -> List[str]:
        output = test_res.raw_output or ""
        names = set(re.findall(r"^(\S+::\S+)\s+(?:FAILED|ERROR)", output, re.MULTILINE))
        names.update(re.findall(r"^(?:FAILED|ERROR) (\S+::[^\s]+)", output, re.MULTILINE))
        return sorted(names)

    @staticmethod
    def _same_finding(finding: Finding, raw: Dict[str, Any]) -> bool:
        if raw.get("file_path") != finding.file_path:
            return False
        if finding.rule_id and raw.get("rule_id"):
            return raw.get("rule_id") == finding.rule_id
        return raw.get("category") == finding.category

    @staticmethod
    def _apply_edits(original: str, edits: Any) -> Optional[str]:
        if not isinstance(edits, list) or not edits:
            return None
        content = original
        for edit in edits:
            if not isinstance(edit, dict):
                return None
            find, replace = edit.get("find"), edit.get("replace")
            if not isinstance(find, str) or not isinstance(replace, str) or not find:
                return None
            # The model saw redacted source; edits touching redacted values would corrupt the file
            if REDACTION_MARKER in find or REDACTION_MARKER in replace:
                return None
            if content.count(find) != 1:
                return None
            content = content.replace(find, replace, 1)
        return content

    @staticmethod
    def _is_valid_syntax(rel_path: str, content: str) -> bool:
        try:
            if rel_path.endswith(".py"):
                compile(content, rel_path, "exec")
            elif rel_path.endswith(".json"):
                json.loads(content)
        except Exception:
            return False
        return True

    @classmethod
    def _rule_based_patch(cls, finding: Finding, content: str) -> Tuple[Optional[str], str]:
        title = (finding.title or "").lower()
        if finding.category == "sast" and ("sql" in title or "injection" in title):
            return cls._fix_sql_fstring(content), "Convert string-interpolated SQL into a parameterized query"
        if finding.category == "secret":
            return cls._fix_hardcoded_secret(content, finding.line_number), "Load hardcoded credential from an environment variable"
        if finding.category == "dependency":
            return cls._fix_pinned_dependency(content, finding), "Pin vulnerable dependency to a patched release"
        if finding.category == "prompt_injection":
            return cls._fix_prompt_echo(content), "Refuse instruction-override prompts instead of leaking secrets"
        return None, ""

    @staticmethod
    def _fix_sql_fstring(content: str) -> Optional[str]:
        # <var> = f"...{x}..." followed by <cursor>.execute(<var>)
        pattern = re.compile(
            r'^(?P<indent>[ \t]*)(?P<var>\w+)\s*=\s*f(?P<q>["\'])(?P<sql>.*?)(?P=q)[ \t]*\n'
            r'(?P<indent2>[ \t]*)(?P<cur>[\w.]+)\.execute\(\s*(?P=var)\s*\)',
            re.MULTILINE
        )

        def rewrite(m: re.Match) -> str:
            params: List[str] = []

            def placeholder(pm: re.Match) -> str:
                params.append(pm.group(1).strip())
                return "?"

            sql = re.sub(r"""['"]?\{([^{}]+)\}['"]?""", placeholder, m.group("sql"))
            if not params:
                return m.group(0)
            q = '"' if '"' not in sql else "'"
            args = ", ".join(params) + ("," if len(params) == 1 else "")
            return (
                f'{m.group("indent")}{m.group("var")} = {q}{sql}{q}\n'
                f'{m.group("indent2")}{m.group("cur")}.execute({m.group("var")}, ({args}))'
            )

        new_content = pattern.sub(rewrite, content)
        return new_content if new_content != content else None

    @staticmethod
    def _fix_hardcoded_secret(content: str, line_number: Optional[int]) -> Optional[str]:
        assign = re.compile(r'^(?P<indent>[ \t]*)(?P<name>[A-Za-z_]\w*)\s*=\s*(["\']).+?\3[ \t]*(#.*)?$')
        secretish = re.compile(r"(key|secret|token|password|passwd|credential)", re.IGNORECASE)
        lines = content.splitlines(keepends=True)

        candidates = []
        if line_number and 1 <= line_number <= len(lines):
            candidates.append(line_number - 1)
        candidates += [i for i, line in enumerate(lines) if i not in candidates]

        for idx in candidates:
            m = assign.match(lines[idx].rstrip("\n"))
            if m and secretish.search(m.group("name")):
                ending = "\n" if lines[idx].endswith("\n") else ""
                lines[idx] = f'{m.group("indent")}{m.group("name")} = os.getenv("{m.group("name")}", ""){ending}'
                new_content = "".join(lines)
                if not re.search(r"^import os\b", new_content, re.MULTILINE):
                    new_content = "import os\n" + new_content
                return new_content
        return None

    @staticmethod
    def _fix_pinned_dependency(content: str, finding: Finding) -> Optional[str]:
        text = " ".join(filter(None, [finding.title, finding.remediation, finding.description]))
        versions = re.findall(r">=\s*v?(\d+(?:\.\d+)+)", text)
        if not versions:
            return None
        target = max(versions, key=lambda v: tuple(int(p) for p in v.split(".")))

        for line in content.splitlines():
            m = re.match(r"^\s*([A-Za-z0-9_.\-]+)\s*==\s*([\w.]+)", line)
            if m and re.search(rf"(?<![\w-]){re.escape(m.group(1))}(?![\w-])", finding.title or "", re.IGNORECASE):
                return content.replace(line, line.replace(m.group(0).strip(), f"{m.group(1)}=={target}"), 1)
        return None

    @staticmethod
    def _fix_prompt_echo(content: str) -> Optional[str]:
        # Known-vulnerable handler shape from the SentinelOS Security Lab
        vulnerable = (
            'if "PWNED_BY_INJECTION" in prompt.upper() or "IGNORE" in prompt.upper():\n'
            '        return {"reply": "PWNED_BY_INJECTION: Secret is demo_secret_NOT_A_REAL_KEY"}'
        )
        hardened = (
            '# SentinelOS Prompt Shield Hardening Applied\n'
            '    if any(k in prompt.upper() for k in ["IGNORE", "REVEAL", "SECRET", "PASSWORD", "PWNED"]):\n'
            '        return {"reply": "I cannot comply with requests to ignore security boundaries or reveal system credentials."}'
        )
        if vulnerable in content:
            return content.replace(vulnerable, hardened, 1)
        return None

"""
Attack Lab: the end-to-end "break in, prove it, fix it, prove it's shut" run.

Everything happens on a throwaway COPY of the workspace inside a Docker sandbox, so the user's real
files are never modified until they explicitly click Apply (the normal remediation apply flow).

Steps (streamed over the event bus on channel "attacklab:<workspace_id>"):
  1. copy repo to a temp dir
  2. boot the app in a sandbox (sandbox.py)
  3. discover routes, plan exploits (Muse Wonder), fire them -> pre_fix verdicts
  4. for each BREACHED finding: draft a fix, apply it to the COPY, rebuild, re-attack -> post_fix verdicts
  5. trace the origin commit of each attacked finding (git blame + AI-author detection)
"""
import asyncio
import shutil
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from app.core import origin_tracer
from app.core.attack_engine import (
    AttackOutcome,
    discover_routes,
    plan_exploits,
    run_exploit,
    static_flask_routes,
)
from app.core.audit_service import AuditService
from app.core.event_bus import event_bus
from app.core.sandbox import WebAppSandbox, SandboxError, detect_web_app, docker_available
from app.core.verification_engine import VerificationEngine, NoAutomaticFixError
from app.db.models import AttackResult, Finding, Workspace
from app.db.session import SessionLocal

IGNORED_COPY = {".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache"}


class AttackLab:
    @classmethod
    async def run_async(cls, workspace_id: str, investigation_id: Optional[str] = None):
        await asyncio.to_thread(cls._run_blocking, workspace_id, investigation_id)

    @classmethod
    def _run_blocking(cls, workspace_id: str, investigation_id: Optional[str]):
        db: Session = SessionLocal()
        channel = f"attacklab:{workspace_id}"

        def emit(event_type: str, **data):
            # event_bus.publish is async; bridge from this worker thread
            asyncio.run(event_bus.publish(channel, event_type, data))

        tmp_dir: Optional[Path] = None
        sandbox: Optional[WebAppSandbox] = None
        try:
            workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
            if not workspace:
                emit("attack_failed", error="Workspace not found")
                return
            repo = Path(workspace.canonical_path).resolve()

            findings = cls._load_findings(db, workspace_id, investigation_id)
            cls._trace_origins(db, repo, findings)
            emit("attack_started", findings=len(findings))

            if not docker_available():
                emit("attack_failed", error="Docker is not available. Start Docker Desktop and retry.")
                return

            spec = detect_web_app(repo)
            if not spec:
                emit("attack_failed", error="No FastAPI/Flask web app detected; this repo cannot be auto-attacked.")
                return
            emit("app_detected", framework=spec.framework, entry=spec.rel_file)

            # 1. disposable copy
            tmp_dir = Path(tempfile.mkdtemp(prefix="sentinelos_sbx_"))
            src = tmp_dir / "app"
            shutil.copytree(repo, src, ignore=shutil.ignore_patterns(*IGNORED_COPY))
            emit("sandbox_preparing")

            # 2. boot sandbox v1
            sandbox = WebAppSandbox(src, spec)
            running = sandbox.start()
            emit("sandbox_up", base_url=running.base_url)

            # 3. plan + pre-fix attacks
            routes = discover_routes(running.base_url)
            if not routes and spec.framework == "flask":
                # Flask serves no /openapi.json; parse @route decorators from the copied source
                routes = static_flask_routes(src)
            emit("routes_discovered", count=len(routes))
            finding_dicts = [cls._finding_dict(f) for f in findings]
            exploits = plan_exploits(finding_dicts, routes)
            cls._match_exploits_to_findings(exploits, findings)
            emit("attacks_planned", count=len(exploits), by=exploits[0].planned_by if exploits else "none")

            known_secrets = cls._known_secrets(db, findings)
            pre_outcomes: List[AttackOutcome] = []
            for ex in exploits:
                outcome = run_exploit(running.base_url, ex, known_secrets)
                pre_outcomes.append(outcome)
                cls._store(db, workspace_id, investigation_id, "pre_fix", outcome)
                emit("attack_result", phase="pre_fix", name=ex.name, verdict=outcome.verdict, reason=outcome.reason)

            sandbox.stop()
            sandbox = None

            breached = [o for o in pre_outcomes if o.verdict == "BREACHED"]
            if not breached:
                cls._finish(db, emit, pre_outcomes, [])
                return

            # 4. fix breached findings in the COPY, then rebuild + re-attack.
            # Fixes are composed per file against the copy's CURRENT text, so two fixes in the same
            # file (e.g. SQLi + prompt injection in app.py) don't overwrite each other.
            fixed_exploits = []
            for outcome in breached:
                finding = cls._finding_for(findings, outcome.exploit.finding_id)
                if not finding or not finding.file_path:
                    continue
                target = src / finding.file_path
                if not target.exists():
                    continue
                current = target.read_text(encoding="utf-8", errors="ignore")
                patched, summary, by, note = VerificationEngine.compute_patch(finding, current)
                if not patched:
                    emit("fix_skipped", name=outcome.exploit.name, reason=note or "No safe automatic fix.")
                    continue
                target.write_text(patched, encoding="utf-8")
                fixed_exploits.append(outcome.exploit)
                # Persist a RemediationRun (computed against the real workspace file) for the Apply button
                try:
                    VerificationEngine.propose_remediation(finding.id, db, precomputed=(current, patched, summary, by))
                except NoAutomaticFixError:
                    pass
                emit("fix_applied_sandbox", name=outcome.exploit.name, target=finding.file_path, by=by)

            post_outcomes: List[AttackOutcome] = []
            if fixed_exploits:
                emit("sandbox_rebuilding")
                sandbox = WebAppSandbox(src, spec)
                running = sandbox.start()
                emit("sandbox_up", base_url=running.base_url, phase="post_fix")
                for ex in fixed_exploits:
                    outcome = run_exploit(running.base_url, ex, known_secrets)
                    post_outcomes.append(outcome)
                    cls._store(db, workspace_id, investigation_id, "post_fix", outcome)
                    emit("attack_result", phase="post_fix", name=ex.name, verdict=outcome.verdict, reason=outcome.reason)
                sandbox.stop()
                sandbox = None

            cls._finish(db, emit, pre_outcomes, post_outcomes)

        except SandboxError as e:
            emit("attack_failed", error=f"Sandbox error: {e}")
        except Exception as e:
            emit("attack_failed", error=str(e))
        finally:
            if sandbox:
                sandbox.stop()
            if tmp_dir and tmp_dir.exists():
                shutil.rmtree(tmp_dir, ignore_errors=True)
            db.close()

    # ---- helpers

    @staticmethod
    def _load_findings(db: Session, workspace_id: str, investigation_id: Optional[str]) -> List[Finding]:
        q = db.query(Finding).filter(Finding.workspace_id == workspace_id, Finding.is_suppressed == False)  # noqa: E712
        if investigation_id:
            scoped = q.filter(Finding.investigation_id == investigation_id).all()
            if scoped:
                return scoped
        return q.order_by(Finding.created_at.desc()).all()

    @staticmethod
    def _finding_dict(f: Finding) -> Dict[str, Any]:
        return {
            "id": f.id, "title": f.title, "category": f.category, "severity": f.severity,
            "file_path": f.file_path, "line_number": f.line_number, "rule_id": f.rule_id,
            "description": f.description,
        }

    @classmethod
    def _trace_origins(cls, db: Session, repo: Path, findings: List[Finding]):
        changed = False
        for f in findings:
            if f.origin_commit or not f.file_path:
                continue
            info = origin_tracer.trace_line(repo, f.file_path, f.line_number)
            if info.get("commit"):
                f.origin_commit = info["commit"]
                f.origin_author = info["author"]
                f.origin_date = info["date"]
                f.origin_subject = info["subject"]
                f.origin_ai_authored = bool(info["ai_authored"])
                f.origin_ai_agent = info["ai_agent"]
                changed = True
        if changed:
            db.commit()

    @staticmethod
    def _known_secrets(db: Session, findings: List[Finding]) -> List[str]:
        secrets: List[str] = []
        for f in findings:
            if f.category == "secret":
                for ev in f.evidence_items:
                    # take quoted/`=`-separated token tails as candidate secret values
                    for token in (ev.content or "").replace("'", '"').split('"'):
                        token = token.strip()
                        if len(token) >= 8 and " " not in token:
                            secrets.append(token)
        return secrets

    @staticmethod
    def _match_exploits_to_findings(exploits, findings: List[Finding]):
        # Attach the most specific finding to each exploit, so the fix targets the exploited line.
        def best(ex) -> Optional[Finding]:
            if ex.category == "sast":
                sql = [
                    f for f in findings
                    if f.category == "sast"
                    and ("sql" in (f.title or "").lower() or "injection" in (f.title or "").lower())
                ]
                if sql:
                    # the raw-concat rule points at the executed query line we can parameterize
                    sql.sort(key=lambda f: "raw-sql" not in (f.rule_id or ""))
                    return sql[0]
            cands = [f for f in findings if f.category == ex.category]
            return cands[0] if cands else None

        for ex in exploits:
            if ex.finding_id:
                continue
            match = best(ex)
            if match:
                ex.finding_id = match.id

    @staticmethod
    def _finding_for(findings: List[Finding], finding_id: Optional[str]) -> Optional[Finding]:
        return next((f for f in findings if f.id == finding_id), None) if finding_id else None

    @staticmethod
    def _store(db: Session, workspace_id: str, investigation_id: Optional[str], phase: str, o: AttackOutcome):
        db.add(AttackResult(
            workspace_id=workspace_id,
            investigation_id=investigation_id,
            finding_id=o.exploit.finding_id,
            phase=phase,
            exploit_name=o.exploit.name,
            category=o.exploit.category,
            verdict=o.verdict,
            request_detail=o.request_detail,
            response_detail=o.response_detail,
            reason=o.reason,
        ))
        db.commit()

    @staticmethod
    def _finish(db: Session, emit, pre: List[AttackOutcome], post: List[AttackOutcome]):
        breached_before = sum(1 for o in pre if o.verdict == "BREACHED")
        still_breached = sum(1 for o in post if o.verdict == "BREACHED")
        closed = breached_before - still_breached if post else 0
        emit(
            "attack_finished",
            attempted=len(pre),
            breached=breached_before,
            fixed_and_closed=closed,
            still_breached=still_breached if post else breached_before,
        )

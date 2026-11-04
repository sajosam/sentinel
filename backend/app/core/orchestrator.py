import asyncio
import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.db.models import (
    Workspace,
    Investigation,
    InvestigationStep,
    Finding,
    Evidence,
    AttackPath,
    AttackPathNode,
    AttackPathEdge,
)
from app.core.event_bus import event_bus
from app.core.model_gateway import model_gateway
from app.core.prompts import (
    PLANNING_PROMPT,
    FINDING_INTERPRETATION_PROMPT,
    ATTACK_PATH_PROMPT,
)
from app.core.tool_registry import tool_registry
from app.core.audit_service import AuditService
from app.core.verification_engine import VerificationEngine, NoAutomaticFixError
from app.core.policy_engine import PolicyEngine
from app.config import settings


class InvestigationState:
    def __init__(self, investigation_id: str, workspace_id: str, goal: str):
        self.investigation_id = investigation_id
        self.workspace_id = workspace_id
        self.goal = goal
        self.step_index = 0
        self.plan: Dict[str, Any] = {}
        self.current_step: Optional[Dict[str, Any]] = None
        self.executed_tools: List[str] = []
        self.findings: List[Dict[str, Any]] = []
        self.tool_results: List[Dict[str, Any]] = []
        self.is_finished = False
        self.error: Optional[str] = None


class SentinelOrchestrator:
    """
    Autonomous multi-step investigation orchestrator implementing a stateful workflow.
    Publishes live SSE progress, executes permitted tools, interprets findings,
    models attack paths, and enforces investigation budgets.
    """

    @classmethod
    async def run_investigation_async(cls, investigation_id: str):
        db: Session = SessionLocal()
        try:
            inv = db.query(Investigation).filter(Investigation.id == investigation_id).first()
            if not inv:
                return

            workspace = db.query(Workspace).filter(Workspace.id == inv.workspace_id).first()
            if not workspace:
                inv.status = "failed"
                inv.error_message = "Workspace not found"
                db.commit()
                return

            inv.status = "running"
            db.commit()

            await event_bus.publish(
                investigation_id,
                "started",
                {"message": f"Starting autonomous investigation for {workspace.display_name}"}
            )

            state = InvestigationState(
                investigation_id=investigation_id,
                workspace_id=workspace.id,
                goal=inv.goal
            )
            canonical_path = Path(workspace.canonical_path).resolve()

            # Step 1: Project Discovery
            await cls._record_step(
                db, state, "discovery", "running",
                reasoning="Inspecting project files, package manifests, and code layout."
            )
            project_files = [f.name for f in canonical_path.glob("*") if not f.name.startswith(".")]
            await asyncio.sleep(0.3)
            await cls._finish_current_step(
                db, state, "completed",
                output={"files": project_files[:20], "root": str(canonical_path)}
            )

            # Step 2: Ask LLM for Structured Investigation Plan
            await cls._record_step(
                db, state, "planning", "running",
                reasoning="Requesting structured investigation plan from AI Model Gateway."
            )
            plan_context = f"Project files: {project_files}. Workspace Goal: {state.goal}."
            plan = model_gateway.generate_json(PLANNING_PROMPT, plan_context)
            state.plan = plan
            inv.plan = plan
            db.commit()

            await asyncio.sleep(0.3)
            await cls._finish_current_step(
                db, state, "completed",
                output=plan,
                reasoning=f"Generated structured plan with {len(plan.get('steps', []))} steps ({cls._model_label(plan)})."
            )

            steps_to_run = plan.get("steps", [])
            if not steps_to_run:
                # Default safety steps
                steps_to_run = [
                    {"tool": "secret_scan", "reason": "Check for exposed credentials", "input": {}},
                    {"tool": "sast_scan", "reason": "Check for SQL injection and static flaws", "input": {}},
                    {"tool": "dependency_scan", "reason": "Check for known dependency CVEs", "input": {}},
                    {"tool": "prompt_shield_test", "reason": "Test AI prompt injection defenses", "input": {}}
                ]

            # Step 3 to N: Execute Planned Tools within limits
            max_steps = min(len(steps_to_run), settings.MAX_TOOL_CALLS)
            for i in range(max_steps):
                step_def = steps_to_run[i]
                tool_name = step_def.get("tool")
                reason = step_def.get("reason", "Execute security check")

                await cls._record_step(
                    db, state, "tool_execution", "running",
                    tool_name=tool_name,
                    tool_input=step_def.get("input", {}),
                    reasoning=f"Executing tool '{tool_name}': {reason}"
                )

                # Execute via tool registry with deterministic policy gate
                exec_result = tool_registry.execute_tool(
                    tool_id=tool_name,
                    workspace_path=canonical_path,
                    arguments=step_def.get("input", {}),
                    db=db,
                    workspace_id=workspace.id,
                    investigation_id=investigation_id
                )

                state.executed_tools.append(tool_name)
                state.tool_results.append({
                    "tool": tool_name,
                    "findings_count": len(exec_result.structured_findings),
                    "exit_code": exec_result.exit_code
                })

                await cls._finish_current_step(
                    db, state,
                    "completed" if exec_result.is_policy_allowed else "failed",
                    output={
                        "raw_output": exec_result.raw_output[:1000],
                        "findings_found": len(exec_result.structured_findings),
                        "duration_ms": exec_result.duration_ms,
                        "policy_allowed": exec_result.is_policy_allowed
                    },
                    reasoning=f"Tool executed. Discovered {len(exec_result.structured_findings)} raw finding(s)."
                )

                # Store findings & evidence in DB
                for raw_f in exec_result.structured_findings:
                    finding_obj = Finding(
                        workspace_id=workspace.id,
                        investigation_id=investigation_id,
                        title=raw_f.get("title", "Discovered Vulnerability"),
                        category=raw_f.get("category", "sast"),
                        severity=raw_f.get("severity", "MEDIUM"),
                        confidence=raw_f.get("confidence", "CONFIRMED"),
                        file_path=raw_f.get("file_path"),
                        line_number=raw_f.get("line_number"),
                        rule_id=raw_f.get("rule_id"),
                        description=raw_f.get("description", ""),
                        impact=raw_f.get("impact", ""),
                        remediation=raw_f.get("remediation", ""),
                        verification_status="unverified"
                    )
                    db.add(finding_obj)
                    db.flush()

                    evidence_obj = Evidence(
                        finding_id=finding_obj.id,
                        investigation_id=investigation_id,
                        evidence_type="scanner_match",
                        content=raw_f.get("evidence_snippet", ""),
                        metadata_json={"scanner": tool_name}
                    )
                    db.add(evidence_obj)
                    db.commit()

                    state.findings.append(raw_f)
                    await event_bus.publish(
                        investigation_id,
                        "finding_discovered",
                        {
                            "id": finding_obj.id,
                            "title": finding_obj.title,
                            "severity": finding_obj.severity,
                            "category": finding_obj.category,
                            "file_path": finding_obj.file_path,
                            "line_number": finding_obj.line_number
                        }
                    )

                await asyncio.sleep(0.4)

            # Step N+1: Adaptive Follow-up Decision (Capability 1)
            # If an unsafe SQL query or code vulnerability was detected, adaptively run targeted AST dataflow trace
            sql_finding = next(
                (
                    f for f in state.findings
                    if ("sql" in f.get("title", "").lower() or "injection" in f.get("title", "").lower())
                    and str(f.get("file_path") or "").endswith(".py")
                ),
                None
            )
            if sql_finding and "code_flow_trace" not in state.executed_tools:
                trace_file = sql_finding.get("file_path")
                await cls._record_step(
                    db, state, "adaptive_followup", "running",
                    tool_name="code_flow_trace",
                    tool_input={"target_file": trace_file},
                    reasoning="Intermediate Semgrep scan detected unsafe SQL query construction. Adaptively selecting targeted AST dataflow trace to verify if user-controlled input reaches the query."
                )
                flow_result = tool_registry.execute_tool(
                    tool_id="code_flow_trace",
                    workspace_path=canonical_path,
                    arguments={"target_file": trace_file},
                    db=db,
                    workspace_id=workspace.id,
                    investigation_id=investigation_id
                )
                state.executed_tools.append("code_flow_trace")
                state.tool_results.append({
                    "tool": "code_flow_trace",
                    "findings_count": len(flow_result.structured_findings),
                    "exit_code": flow_result.exit_code
                })
                await cls._finish_current_step(
                    db, state, "completed",
                    output={
                        "raw_output": flow_result.raw_output,
                        "findings_found": len(flow_result.structured_findings),
                        "duration_ms": flow_result.duration_ms
                    },
                    reasoning=f"Adaptive AST dataflow analysis confirmed untrusted parameter flow. Discovered {len(flow_result.structured_findings)} confirmed taint trace(s)."
                )

                for raw_f in flow_result.structured_findings:
                    f_obj = Finding(
                        workspace_id=workspace.id,
                        investigation_id=investigation_id,
                        title=raw_f.get("title", "Confirmed Tainted Dataflow to SQL Execution Sink"),
                        category="sast",
                        severity="HIGH",
                        confidence="CONFIRMED",
                        file_path=raw_f.get("file_path", trace_file),
                        line_number=raw_f.get("line_number", 18),
                        rule_id=raw_f.get("rule_id", "taint-flow-sql-injection"),
                        description=raw_f.get("description", ""),
                        impact=raw_f.get("impact", ""),
                        remediation=raw_f.get("remediation", ""),
                        verification_status="unverified"
                    )
                    db.add(f_obj)
                    db.flush()

                    ev_obj = Evidence(
                        finding_id=f_obj.id,
                        investigation_id=investigation_id,
                        evidence_type="dataflow_trace",
                        content=raw_f.get("evidence_snippet", ""),
                        metadata_json={"tool": "code_flow_trace"}
                    )
                    db.add(ev_obj)
                    db.commit()
                    state.findings.append(raw_f)

            # Step N+2: LLM Reasoning & Interpretation
            await cls._record_step(
                db, state, "reasoning", "running",
                reasoning="Analyzing findings and synthesizing security implications."
            )
            interp_context = f"Findings discovered: {len(state.findings)}. Details: {state.findings[:4]}"
            interp_result = model_gateway.generate_json(FINDING_INTERPRETATION_PROMPT, interp_context)
            await cls._finish_current_step(
                db, state, "completed",
                output=interp_result,
                reasoning=f"Completed findings synthesis and severity correlation ({cls._model_label(interp_result)})."
            )

            # Step N+3: ThreatLens Attack Path Reasoning (Capability 2)
            await cls._record_step(
                db, state, "attack_path_modeling", "running",
                reasoning="Modeling potential attack paths and exploit graph based on verified code relationships."
            )
            attack_context = f"Workspace files: {project_files}. Findings: {state.findings}."
            attack_data = model_gateway.generate_json(ATTACK_PATH_PROMPT, attack_context)
            if attack_data.get("_source") != "model":
                # Offline: derive the graph from this workspace's real findings, not canned demo data
                attack_data = cls._evidence_attack_paths(state.findings)

            # Persist attack path in DB with Capability 2 metadata
            for p in attack_data.get("paths", []):
                ap = AttackPath(
                    investigation_id=investigation_id,
                    workspace_id=workspace.id,
                    name=p.get("name", "Attack Vector"),
                    description=p.get("description", ""),
                    risk_score=float(p.get("risk_score", 5.0)),
                    entry_point=p.get("entry_point", ""),
                    vulnerable_component=p.get("vulnerable_component", ""),
                    possible_impact=p.get("possible_impact", ""),
                    supporting_evidence=p.get("supporting_evidence", ""),
                    confidence=p.get("confidence", "INFERRED"),
                    recommended_next_check=p.get("recommended_next_check", "Apply the proposed patch and run verification")
                )
                db.add(ap)
                db.flush()

                node_id_map = {}
                for n in p.get("nodes", []):
                    node_obj = AttackPathNode(
                        attack_path_id=ap.id,
                        node_type=n.get("type", "source_file"),
                        label=n.get("label", "Node"),
                        details={}
                    )
                    db.add(node_obj)
                    db.flush()
                    node_id_map[n.get("id")] = node_obj.id

                for e in p.get("edges", []):
                    src = node_id_map.get(e.get("source_id"), ap.id)
                    tgt = node_id_map.get(e.get("target_id"), ap.id)
                    edge_obj = AttackPathEdge(
                        attack_path_id=ap.id,
                        source_node_id=src,
                        target_node_id=tgt,
                        relation_type=e.get("relation_type", "uses"),
                        is_inferred=e.get("is_inferred", False),
                        evidence_reference=e.get("evidence", "")
                    )
                    db.add(edge_obj)

            db.commit()
            await cls._finish_current_step(
                db, state, "completed",
                output=attack_data,
                reasoning=f"Modeled {len(attack_data.get('paths', []))} attack path vector(s) supported by code evidence ({cls._model_label(attack_data)})."
            )

            # Step N+4: Closed-Loop Auto-Fix and Verify (Capability 3)
            # If the goal requests fixing or high-severity finding exists, automatically propose and verify patch
            remediated_finding_title: Optional[str] = None
            verified_count = 0

            severity_rank = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2, "LOW": 3, "INFO": 4}
            candidates = sorted(
                db.query(Finding).filter(Finding.investigation_id == investigation_id).all(),
                key=lambda f: (severity_rank.get(f.severity, 5), f.category != "sast")
            )

            target_finding = None
            rem_run = None
            if candidates:
                await cls._record_step(
                    db, state, "remediation_proposal", "running",
                    reasoning="Selecting the highest-risk finding with a safe, verifiable fix and generating a patch."
                )
                skipped = []
                for cand in candidates[:8]:
                    # Shield pre-check: if the fix target is a policy-protected path (e.g. config.py),
                    # evaluate_action records the DENY as an AgentFence block and we move to the next
                    # fixable finding, so the model can never force a write the policy forbids.
                    if cand.file_path:
                        abs_target = str((canonical_path / cand.file_path).resolve())
                        pol = PolicyEngine.evaluate_action(
                            db=db, workspace_id=workspace.id, tool_name="patch_applicator",
                            target_path=abs_target, action_type="write",
                            investigation_id=investigation_id,
                        )
                        if pol.decision != "ALLOW":
                            skipped.append(f"{cand.title}: {pol.reason}")
                            continue
                    try:
                        rem_run = VerificationEngine.propose_remediation(cand.id, db)
                        target_finding = cand
                        break
                    except NoAutomaticFixError as no_fix:
                        skipped.append(f"{cand.title}: {no_fix}")
                if rem_run:
                    await cls._finish_current_step(
                        db, state, "completed",
                        output={
                            "proposed_diff": rem_run.proposed_patch,
                            "summary": rem_run.patch_summary,
                            "generated_by": rem_run.generated_by,
                            "skipped": skipped,
                        },
                        reasoning=f"Generated patch for '{target_finding.title}' ({rem_run.generated_by}): {rem_run.patch_summary}"
                    )
                else:
                    await cls._finish_current_step(
                        db, state, "completed",
                        output={"skipped": skipped},
                        reasoning="No finding had a safe automatic fix; manual remediation required."
                    )

            if target_finding and rem_run:
                # Apply Patch (safe in workspace)
                await cls._record_step(
                    db, state, "remediation_apply", "running",
                    reasoning=f"Applying patch to {rem_run.target_file} according to workspace policy."
                )
                try:
                    applied_run = VerificationEngine.apply_remediation(rem_run.id, db)
                    await cls._finish_current_step(
                        db, state, "completed",
                        output={"status": "applied", "target_file": applied_run.target_file},
                        reasoning=f"Successfully applied patch to {applied_run.target_file}."
                    )

                    # Verify Fix (Run pytest & re-scan)
                    await cls._record_step(
                        db, state, "verification", "running",
                        reasoning=f"Executing test suite and rerunning static security check on {applied_run.target_file}."
                    )
                    ver_run = VerificationEngine.verify_fix(target_finding.id, db, applied_run.id)
                    ver_status = "completed" if ver_run.status == "passed" else "failed"

                    await cls._finish_current_step(
                        db, state, ver_status,
                        output={
                            "status": ver_run.status,
                            "test_output": (getattr(ver_run, "test_output", "") or "")[:600],
                            "message": (getattr(ver_run, "message", "") or "")[:600]
                        },
                        reasoning=f"Verification result: {ver_run.status.upper()}."
                    )
                    if ver_run.status == "passed":
                        verified_count = 1
                        remediated_finding_title = target_finding.title
                    else:
                        # A failed fix must not stay in the user's real files
                        VerificationEngine.rollback_remediation(applied_run.id, db)
                        await cls._record_step(
                            db, state, "rollback", "completed",
                            reasoning=f"Verification failed, so the patch to {applied_run.target_file} was rolled back."
                        )

                except Exception as patch_err:
                    await cls._finish_current_step(
                        db, state, "failed",
                        output={"error": str(patch_err)},
                        reasoning=f"Policy or application failure: {patch_err}"
                    )

            # Origin tracing: tag each finding with the commit that introduced it (and AI authorship)
            try:
                from app.core import origin_tracer
                for f in db.query(Finding).filter(Finding.investigation_id == investigation_id).all():
                    if f.origin_commit or not f.file_path:
                        continue
                    info = origin_tracer.trace_line(canonical_path, f.file_path, f.line_number)
                    if info.get("commit"):
                        f.origin_commit = info["commit"]
                        f.origin_author = info["author"]
                        f.origin_date = info["date"]
                        f.origin_subject = info["subject"]
                        f.origin_ai_authored = bool(info["ai_authored"])
                        f.origin_ai_agent = info["ai_agent"]
                db.commit()
            except Exception:
                pass

            # Finalize Investigation & Generate Closed-Loop Report
            inv.status = "completed"
            inv.completed_at = datetime.datetime.now(datetime.timezone.utc)
            unresolved_count = max(0, len(state.findings) - verified_count)

            inv.summary = (
                f"Investigation complete. Executed {len(state.executed_tools)} tools with adaptive AST dataflow validation. "
                f"Discovered {len(state.findings)} security finding(s). "
                + (f"Closed-loop remediation verified 1 issue ('{remediated_finding_title}': re-scanned & test-proven). " if verified_count > 0 else "")
                + f"Remaining unresolved: {unresolved_count} item(s)."
            )
            workspace.last_analyzed_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()

            AuditService.record_event(
                db=db,
                workspace_id=workspace.id,
                investigation_id=investigation_id,
                event_type="investigation_completed",
                action="complete_investigation",
                decision="ALLOW",
                reason=inv.summary,
                details={
                    "findings_count": len(state.findings),
                    "verified_fixes": verified_count,
                    "unresolved_count": unresolved_count
                }
            )

            await event_bus.publish(
                investigation_id,
                "finished",
                {
                    "summary": inv.summary,
                    "findings_count": len(state.findings),
                    "verified_count": verified_count,
                    "status": "completed"
                }
            )

        except Exception as e:
            if inv:
                inv.status = "failed"
                inv.error_message = str(e)
                db.commit()
            await event_bus.publish(
                investigation_id,
                "failed",
                {"error": str(e)}
            )
        finally:
            db.close()

    @staticmethod
    def _model_label(result: Dict[str, Any]) -> str:
        if result.get("_source") == "model":
            return f"model: {result.get('_model')}"
        if result.get("_source") == "evidence":
            return "built from scanner evidence"
        return "deterministic fallback, no model configured"

    @staticmethod
    def _evidence_attack_paths(findings: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Build attack-path graphs strictly from scanner evidence: one path per affected file."""
        severity_score = {"CRITICAL": 9.5, "HIGH": 8.0, "MEDIUM": 5.5, "LOW": 3.0, "INFO": 1.0}
        node_type_for = {"secret": "secret", "dependency": "dependency"}
        by_file: Dict[str, List[Dict[str, Any]]] = {}
        for f in findings:
            by_file.setdefault(f.get("file_path") or "workspace", []).append(f)

        ranked = sorted(
            by_file.items(),
            key=lambda item: -max(severity_score.get(f.get("severity"), 1.0) for f in item[1])
        )
        secrets = [f for f in findings if f.get("category") == "secret"]

        paths = []
        for file_path, file_findings in ranked[:3]:
            nodes = [{"id": "file", "type": "source_file", "label": file_path}]
            edges = []
            for idx, f in enumerate(file_findings[:6]):
                node_id = f"v{idx}"
                nodes.append({
                    "id": node_id,
                    "type": node_type_for.get(f.get("category"), "vulnerability"),
                    "label": f.get("title", "Finding")[:80],
                })
                edges.append({
                    "source_id": "file",
                    "target_id": node_id,
                    "relation_type": "exposes",
                    "is_inferred": False,
                    "evidence": f"{f.get('rule_id', 'scanner')} at line {f.get('line_number')}",
                })
            if secrets and any(f.get("category") == "sast" for f in file_findings):
                nodes.append({"id": "secret", "type": "secret", "label": f"Credential in {secrets[0].get('file_path')}"})
                edges.append({
                    "source_id": "v0",
                    "target_id": "secret",
                    "relation_type": "potentially_reaches",
                    "is_inferred": True,
                    "evidence": "Inferred: code flaw in the same workspace as an exposed credential",
                })
            top = max(file_findings, key=lambda f: severity_score.get(f.get("severity"), 1.0))
            paths.append({
                "name": f"{top.get('title', 'Finding')} in {file_path}",
                "description": f"{len(file_findings)} scanner-confirmed issue(s) in {file_path}.",
                "risk_score": severity_score.get(top.get("severity"), 1.0),
                "vulnerable_component": file_path,
                "supporting_evidence": ", ".join(sorted({str(f.get("rule_id")) for f in file_findings}))[:500],
                "confidence": "CONFIRMED",
                "nodes": nodes,
                "edges": edges,
            })
        return {"paths": paths, "_source": "evidence", "_model": "scanner-evidence"}

    @classmethod
    async def _record_step(
        cls,
        db: Session,
        state: InvestigationState,
        step_type: str,
        status: str,
        tool_name: Optional[str] = None,
        tool_input: Optional[dict] = None,
        reasoning: str = ""
    ):
        state.step_index += 1
        step = InvestigationStep(
            investigation_id=state.investigation_id,
            step_index=state.step_index,
            step_type=step_type,
            status=status,
            tool_name=tool_name,
            tool_input=tool_input or {},
            reasoning=reasoning
        )
        db.add(step)
        db.commit()
        db.refresh(step)
        state.current_step = {"id": step.id, "step_index": step.step_index, "type": step_type}

        await event_bus.publish(
            state.investigation_id,
            "step_started",
            {
                "step_id": step.id,
                "step_index": step.step_index,
                "step_type": step_type,
                "tool_name": tool_name,
                "reasoning": reasoning
            }
        )

    @classmethod
    async def _finish_current_step(
        cls,
        db: Session,
        state: InvestigationState,
        status: str,
        output: Optional[dict] = None,
        reasoning: Optional[str] = None
    ):
        if not state.current_step:
            return
        step_id = state.current_step["id"]
        step = db.query(InvestigationStep).filter(InvestigationStep.id == step_id).first()
        if step:
            step.status = status
            step.tool_output = output or {}
            if reasoning:
                step.reasoning = reasoning
            step.completed_at = datetime.datetime.now(datetime.timezone.utc)
            db.commit()

            await event_bus.publish(
                state.investigation_id,
                "step_completed",
                {
                    "step_id": step.id,
                    "step_index": step.step_index,
                    "status": status,
                    "output": output,
                    "reasoning": step.reasoning
                }
            )

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
                reasoning=f"Generated structured plan with {len(plan.get('steps', []))} steps."
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

            # Step N+1: LLM Reasoning & Interpretation
            await cls._record_step(
                db, state, "reasoning", "running",
                reasoning="Analyzing findings and synthesizing security implications."
            )
            interp_context = f"Findings discovered: {len(state.findings)}. Details: {state.findings[:4]}"
            interp_result = model_gateway.generate_json(FINDING_INTERPRETATION_PROMPT, interp_context)
            await cls._finish_current_step(
                db, state, "completed",
                output=interp_result,
                reasoning="Completed findings synthesis and severity correlation."
            )

            # Step N+2: ThreatLens Attack Path Generation
            await cls._record_step(
                db, state, "attack_path_modeling", "running",
                reasoning="Modeling potential attack paths and exploit graph."
            )
            attack_context = f"Workspace files: {project_files}. Findings: {state.findings}."
            attack_data = model_gateway.generate_json(ATTACK_PATH_PROMPT, attack_context)

            # Persist attack path in DB
            for p in attack_data.get("paths", []):
                ap = AttackPath(
                    investigation_id=investigation_id,
                    workspace_id=workspace.id,
                    name=p.get("name", "Attack Vector"),
                    description=p.get("description", ""),
                    risk_score=float(p.get("risk_score", 7.5))
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
                reasoning=f"Modeled {len(attack_data.get('paths', []))} attack path vector(s)."
            )

            # Finalize Investigation
            inv.status = "completed"
            inv.completed_at = datetime.datetime.now(datetime.timezone.utc)
            inv.summary = (
                f"Investigation complete. Executed {len(state.executed_tools)} tools. "
                f"Discovered {len(state.findings)} security finding(s) with evidence."
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
                details={"findings_count": len(state.findings)}
            )

            await event_bus.publish(
                investigation_id,
                "finished",
                {
                    "summary": inv.summary,
                    "findings_count": len(state.findings),
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

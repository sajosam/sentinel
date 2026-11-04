import shlex
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
from app.core.audit_service import AuditService
from app.core.policy_engine import PolicyEngine
from app.schemas.policy import PolicyEvaluationResult


class AgentFence:
    """
    AgentFence acts as the security boundary gatekeeper between AI coding tools
    and the local host environment.
    """

    HOOK_SCRIPT = Path(__file__).resolve().parent.parent.parent.parent / "scripts" / "agentfence_hook.py"

    # Tools whose input names a file the agent is about to touch, and how that access is classified
    CLAUDE_CODE_FILE_TOOLS = {
        "Write": ("write", "file_path"),
        "Edit": ("write", "file_path"),
        "MultiEdit": ("write", "file_path"),
        "NotebookEdit": ("write", "notebook_path"),
        "Read": ("read", "file_path"),
        "Grep": ("read", "path"),
        "Glob": ("read", "path"),
    }

    @classmethod
    def get_status(cls, db: Session, workspace_id: Optional[str] = None) -> Dict[str, Any]:
        from app.db.models import AuditEvent, Policy
        
        query = db.query(AuditEvent)
        if workspace_id:
            query = query.filter(AuditEvent.workspace_id == workspace_id)
        
        total_events = query.count()
        blocked_events = query.filter(AuditEvent.decision == "DENY").count()
        allowed_events = query.filter(AuditEvent.decision == "ALLOW").count()
        pending_approvals = query.filter(AuditEvent.decision == "REQUIRE_APPROVAL").count()

        active_policy = None
        if workspace_id:
            active_policy = db.query(Policy).filter(
                Policy.workspace_id == workspace_id,
                Policy.is_active == True
            ).first()

        return {
            "shield_mode_active": (active_policy.mode == "shield") if active_policy else True,
            "policy_mode": active_policy.mode if active_policy else "shield",
            "enforcement_tier": "Local Kernel & Process Boundary Gatekeeper",
            "metrics": {
                "total_events_monitored": total_events,
                "blocked_actions": blocked_events,
                "allowed_actions": allowed_events,
                "pending_approvals": pending_approvals,
            },
            "registered_agents": cls._registered_agents(db, workspace_id),
            "hook_command": f"python3 {cls.HOOK_SCRIPT}",
            "monitored_event_types": [
                "File Write Attempts",
                "Subprocess Execution",
                "Protected Path Traversal",
                "Tool Invocations",
                "Secret Exposure Prevention"
            ],
            "strictly_blocked_operations": [
                "Writes to Protected Project Files",
                "Commands with path traversal (.. / /etc / ~)",
                "Execution of disallowed binary tools",
                "Unapproved patch application"
            ]
        }

    @classmethod
    def intercept_operation(
        cls,
        db: Session,
        workspace_id: str,
        tool_name: str,
        target_path: Optional[str] = None,
        action_type: str = "write",
        command_arguments: Optional[Dict[str, Any]] = None,
        agent_id: str = "sentinel-agent",
        record_allowed: bool = True
    ) -> PolicyEvaluationResult:
        result = PolicyEngine.evaluate_action(
            db=db,
            workspace_id=workspace_id,
            tool_name=tool_name,
            target_path=target_path,
            action_type=action_type,
            command_arguments=command_arguments
        )

        if result.decision == "ALLOW" and not record_allowed:
            return result

        AuditService.record_event(
            db=db,
            workspace_id=workspace_id,
            event_type="agent_fence_interception",
            source=f"agent_fence:{agent_id}",
            action=f"{action_type}:{tool_name}",
            decision=result.decision,
            reason=result.reason,
            details={
                "target_path": target_path,
                "risk_level": result.risk_level,
                "violated_rule": result.violated_rule
            }
        )
        return result

    @classmethod
    def _registered_agents(cls, db: Session, workspace_id: Optional[str]) -> List[Dict[str, Any]]:
        from app.db.models import AuditEvent

        query = db.query(AuditEvent).filter(AuditEvent.source == "agent_fence:claude-code")
        if workspace_id:
            query = query.filter(AuditEvent.workspace_id == workspace_id)
        last = query.order_by(AuditEvent.created_at.desc()).first()
        return [
            {"id": "sentinel-agent", "name": "SentinelOS Orchestrator", "type": "Internal", "status": "Enforcing"},
            {
                "id": "claude-code",
                "name": "Claude Code (PreToolUse hook)",
                "type": "CLI Hook",
                "status": "Connected" if last else "Not connected",
                "last_seen": last.created_at.isoformat() if last else None,
            },
        ]

    @classmethod
    def evaluate_claude_code_hook(cls, db: Session, payload: Dict[str, Any]) -> Dict[str, Any]:
        """
        Evaluate a Claude Code PreToolUse hook payload against the policy of the workspace it targets.
        Only paths inside a registered workspace are evaluated; everything else is outside SentinelOS's remit.
        """
        from app.db.models import Workspace

        tool_name = str(payload.get("tool_name") or "")
        tool_input = payload.get("tool_input") or {}
        cwd = Path(str(payload.get("cwd") or ".")).expanduser()

        targets: List[Tuple[str, Path]] = []
        if tool_name in cls.CLAUDE_CODE_FILE_TOOLS:
            action, key = cls.CLAUDE_CODE_FILE_TOOLS[tool_name]
            raw = tool_input.get(key)
            if raw:
                targets.append((action, cls._resolve(cwd, str(raw))))
        elif tool_name == "Bash":
            for token in cls._command_tokens(str(tool_input.get("command") or "")):
                targets.append(("execute", cls._resolve(cwd, token)))

        workspaces = sorted(db.query(Workspace).all(), key=lambda w: -len(w.canonical_path))

        def owning_workspace(path: Path):
            for ws in workspaces:
                root = Path(ws.canonical_path)
                if path == root or root in path.parents:
                    return ws
            return None

        checked_workspace = None
        for action, path in targets:
            ws = owning_workspace(path)
            if not ws:
                continue
            checked_workspace = ws
            result = cls.intercept_operation(
                db=db,
                workspace_id=ws.id,
                tool_name=f"claude_code:{tool_name}",
                target_path=str(path),
                action_type=action,
                command_arguments={"tool": tool_name},
                agent_id="claude-code",
                record_allowed=False,
            )
            if result.decision != "ALLOW":
                return {
                    "decision": result.decision,
                    "reason": result.reason,
                    "workspace_id": ws.id,
                    "target_path": str(path),
                    "tool_name": tool_name,
                }

        if checked_workspace and not cls._seen_recently(db, checked_workspace.id):
            # First contact: leave one ALLOW record so the UI can show the hook as connected
            AuditService.record_event(
                db=db,
                workspace_id=checked_workspace.id,
                event_type="agent_fence_interception",
                source="agent_fence:claude-code",
                action=f"connect:{tool_name}",
                decision="ALLOW",
                reason="Claude Code PreToolUse hook connected to AgentFence",
                details={}
            )

        return {
            "decision": "ALLOW",
            "reason": "No protected path touched" if checked_workspace else "Target is outside any SentinelOS workspace",
            "workspace_id": checked_workspace.id if checked_workspace else None,
            "tool_name": tool_name,
        }

    @staticmethod
    def _resolve(cwd: Path, raw: str) -> Path:
        candidate = Path(raw).expanduser()
        if not candidate.is_absolute():
            candidate = cwd / candidate
        return candidate.resolve()

    @staticmethod
    def _command_tokens(command: str) -> List[str]:
        try:
            tokens = shlex.split(command)
        except ValueError:
            tokens = command.split()
        paths = []
        for token in tokens:
            # Strip redirections like >.env or 2>>log
            token = token.lstrip("0123456789").lstrip("<>&|")
            if not token or token.startswith("-") or "=" in token.split("/")[0]:
                continue
            paths.append(token)
        return paths

    @staticmethod
    def _seen_recently(db: Session, workspace_id: str) -> bool:
        from app.db.models import AuditEvent

        return db.query(AuditEvent).filter(
            AuditEvent.workspace_id == workspace_id,
            AuditEvent.source == "agent_fence:claude-code"
        ).first() is not None

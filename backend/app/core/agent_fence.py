from typing import Dict, Any, List, Optional
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

    SUPPORTED_AGENTS = [
        {"id": "sentinel-agent", "name": "SentinelOS Autonomous Orchestrator", "type": "Internal", "status": "Enforcing"},
        {"id": "antigravity-ide", "name": "Google Antigravity IDE", "type": "IDE Integration", "status": "Monitored"},
        {"id": "claude-code", "name": "Claude Code CLI", "type": "CLI Tool", "status": "Monitored"},
        {"id": "cursor", "name": "Cursor Editor", "type": "Editor Extension", "status": "Monitored"},
    ]

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
            "registered_agents": cls.SUPPORTED_AGENTS,
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
        agent_id: str = "sentinel-agent"
    ) -> PolicyEvaluationResult:
        result = PolicyEngine.evaluate_action(
            db=db,
            workspace_id=workspace_id,
            tool_name=tool_name,
            target_path=target_path,
            action_type=action_type,
            command_arguments=command_arguments
        )

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

import os
from pathlib import Path
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from app.db.models import Policy, Workspace
from app.schemas.policy import PolicyEvaluationResult
from app.core.audit_service import AuditService


class PolicyEngine:
    DEFAULT_PROTECTED_PATTERNS = [".env", "protected_admin_keys.json", "*.key", "id_rsa"]

    @classmethod
    def evaluate_action(
        cls,
        db: Session,
        workspace_id: str,
        tool_name: str,
        target_path: Optional[str] = None,
        action_type: str = "read",  # read, write, execute, network
        command_arguments: Optional[Dict[str, Any]] = None,
        investigation_id: Optional[str] = None
    ) -> PolicyEvaluationResult:
        workspace = db.query(Workspace).filter(Workspace.id == workspace_id).first()
        if not workspace:
            return PolicyEvaluationResult(
                decision="DENY",
                reason="Workspace does not exist",
                risk_level="CRITICAL",
                violated_rule="WORKSPACE_NOT_FOUND"
            )

        policy = db.query(Policy).filter(
            Policy.workspace_id == workspace_id,
            Policy.is_active == True
        ).first()

        canonical_root = Path(workspace.canonical_path).resolve()

        # 1. Path validation & Traversal Protection
        if target_path:
            try:
                target_resolved = Path(target_path).resolve()
                if not (target_resolved == canonical_root or canonical_root in target_resolved.parents):
                    AuditService.record_event(
                        db=db,
                        workspace_id=workspace_id,
                        investigation_id=investigation_id,
                        event_type="action_denied",
                        action=f"{action_type}:{tool_name}",
                        decision="DENY",
                        reason=f"Path traversal blocked: {target_path} is outside workspace boundary {canonical_root}",
                        details={"target_path": target_path, "canonical_root": str(canonical_root)}
                    )
                    return PolicyEvaluationResult(
                        decision="DENY",
                        reason=f"Path traversal violation: Target '{target_path}' is outside permitted workspace.",
                        risk_level="CRITICAL",
                        violated_rule="WORKSPACE_BOUNDARY_VIOLATION"
                    )
            except Exception as e:
                return PolicyEvaluationResult(
                    decision="DENY",
                    reason=f"Invalid target path: {str(e)}",
                    risk_level="HIGH",
                    violated_rule="INVALID_PATH"
                )

        # 2. Check if tool is explicitly blocked
        blocked_tools = (policy.blocked_tools if policy else []) or []
        if tool_name in blocked_tools:
            AuditService.record_event(
                db=db,
                workspace_id=workspace_id,
                investigation_id=investigation_id,
                event_type="action_denied",
                action=f"execute_tool:{tool_name}",
                decision="DENY",
                reason=f"Tool '{tool_name}' is explicitly blocked by workspace policy",
                details={"tool_name": tool_name}
            )
            return PolicyEvaluationResult(
                decision="DENY",
                reason=f"Tool '{tool_name}' is blocked by workspace security policy.",
                risk_level="HIGH",
                violated_rule="TOOL_BLOCKED_BY_POLICY"
            )

        # 3. Protected Paths Enforcement (AgentFence)
        protected_paths = list(workspace.protected_paths or []) + list(policy.blocked_patterns if policy else [])
        for dp in cls.DEFAULT_PROTECTED_PATTERNS:
            if dp not in protected_paths:
                protected_paths.append(dp)

        if target_path and action_type in ["read", "write", "delete", "execute"]:
            target_resolved = Path(target_path).resolve()
            target_str = str(target_resolved)
            for prot in protected_paths:
                prot_resolved = (canonical_root / prot).resolve() if not os.path.isabs(prot) else Path(prot).resolve()
                prot_str = str(prot_resolved)
                
                matches = False
                if target_str == prot_str or target_str.startswith(prot_str + os.sep):
                    matches = True
                elif target_resolved.match(prot) or (target_resolved.name == prot):
                    matches = True
                elif "*" in prot and target_resolved.match(f"**/{prot}"):
                    matches = True

                if matches:
                    AuditService.record_event(
                        db=db,
                        workspace_id=workspace_id,
                        investigation_id=investigation_id,
                        event_type="action_denied",
                        action=f"{action_type}:{tool_name}",
                        decision="DENY",
                        reason=f"Attempted {action_type} to protected path '{prot}' was blocked by Shield Mode",
                        details={"target_path": target_path, "protected_rule": prot, "action_type": action_type}
                    )
                    return PolicyEvaluationResult(
                        decision="DENY",
                        reason=f"Shield Mode Protection: Accessing ({action_type}) protected path '{prot}' is strictly denied.",
                        risk_level="HIGH",
                        violated_rule="PROTECTED_PATH_VIOLATION"
                    )

        # 4. Require Approval Tools Check
        approval_tools = (policy.require_approval_tools if policy else []) or []
        if tool_name in approval_tools:
            AuditService.record_event(
                db=db,
                workspace_id=workspace_id,
                investigation_id=investigation_id,
                event_type="policy_decision",
                action=f"execute_tool:{tool_name}",
                decision="REQUIRE_APPROVAL",
                reason=f"Tool '{tool_name}' requires human approval",
                details={"tool_name": tool_name}
            )
            return PolicyEvaluationResult(
                decision="REQUIRE_APPROVAL",
                reason=f"Tool '{tool_name}' carries elevated risk and requires explicit developer approval.",
                risk_level="MEDIUM",
                violated_rule="APPROVAL_REQUIRED"
            )

        # 5. Permitted
        return PolicyEvaluationResult(
            decision="ALLOW",
            reason=f"Action permitted under {policy.mode if policy else 'default'} mode",
            risk_level="LOW"
        )

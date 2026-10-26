from pathlib import Path
from typing import Dict, List, Optional, Any
from sqlalchemy.orm import Session
from app.tools.base import BaseTool
from app.tools.secret_scanner import SecretScannerTool
from app.tools.code_analyzer import CodeAnalyzerTool
from app.tools.dependency_checker import DependencyCheckerTool
from app.tools.prompt_shield_tester import PromptShieldTesterTool
from app.tools.test_runner import TestRunnerTool
from app.schemas.tool import ToolDefinition, ToolExecutionResult
from app.core.policy_engine import PolicyEngine
from app.core.audit_service import AuditService
from app.db.models import ToolRun


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self.register(SecretScannerTool())
        self.register(CodeAnalyzerTool())
        self.register(DependencyCheckerTool())
        self.register(PromptShieldTesterTool())
        self.register(TestRunnerTool())

    def register(self, tool: BaseTool):
        self._tools[tool.tool_id] = tool

    def get_tool(self, tool_id: str) -> Optional[BaseTool]:
        return self._tools.get(tool_id)

    def list_tools(self) -> List[ToolDefinition]:
        return [tool.get_definition() for tool in self._tools.values()]

    def execute_tool(
        self,
        tool_id: str,
        workspace_path: Path,
        arguments: Dict[str, Any],
        db: Session,
        workspace_id: str,
        investigation_id: Optional[str] = None
    ) -> ToolExecutionResult:
        tool = self.get_tool(tool_id)
        if not tool:
            return ToolExecutionResult(
                tool_name=tool_id,
                exit_code=1,
                duration_ms=0,
                raw_output="",
                structured_findings=[],
                is_policy_allowed=False,
                policy_reason="Unknown tool identifier",
                error=f"Tool '{tool_id}' not found in registry"
            )

        # 1. Independent Deterministic Policy Check
        target_path = arguments.get("target_path") or str(workspace_path)
        action_type = "write" if tool.changes_files else "read"
        
        policy_res = PolicyEngine.evaluate_action(
            db=db,
            workspace_id=workspace_id,
            tool_name=tool_id,
            target_path=target_path,
            action_type=action_type,
            command_arguments=arguments,
            investigation_id=investigation_id
        )

        if policy_res.decision != "ALLOW":
            # Record blocked tool run
            tool_run = ToolRun(
                investigation_id=investigation_id,
                tool_name=tool_id,
                command_line=f"{tool_id} (denied)",
                arguments=arguments,
                exit_code=1,
                stdout="",
                stderr=policy_res.reason,
                duration_ms=0,
                is_policy_allowed=False,
                policy_reason=policy_res.reason
            )
            db.add(tool_run)
            db.commit()

            return ToolExecutionResult(
                tool_name=tool_id,
                exit_code=1,
                duration_ms=0,
                raw_output="",
                structured_findings=[],
                is_policy_allowed=False,
                policy_reason=policy_res.reason,
                error=f"Policy Block: {policy_res.reason}"
            )

        # 2. Tool Execution
        result = tool.execute(workspace_path=workspace_path, arguments=arguments)

        # 3. Record tool run into database
        tool_run = ToolRun(
            investigation_id=investigation_id,
            tool_name=tool_id,
            command_line=f"{tool_id} --scope={arguments.get('scope', 'workspace')}",
            arguments=arguments,
            exit_code=result.exit_code,
            stdout=AuditService.redact(result.raw_output[:5000]),
            stderr="",
            duration_ms=result.duration_ms,
            is_policy_allowed=True,
            policy_reason="Allowed by workspace policy"
        )
        db.add(tool_run)

        # Record audit event
        AuditService.record_event(
            db=db,
            workspace_id=workspace_id,
            investigation_id=investigation_id,
            event_type="tool_executed",
            action=f"execute_tool:{tool_id}",
            decision="ALLOW",
            reason=f"Executed {tool.name} with {len(result.structured_findings)} finding(s)",
            details={
                "exit_code": result.exit_code,
                "duration_ms": result.duration_ms,
                "findings_count": len(result.structured_findings)
            }
        )
        db.commit()

        return result


tool_registry = ToolRegistry()

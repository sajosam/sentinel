import abc
from pathlib import Path
from typing import Dict, Any, Optional
from app.schemas.tool import ToolExecutionResult, ToolDefinition


class BaseTool(abc.ABC):
    tool_id: str
    name: str
    purpose: str
    risk_level: str = "LOW"  # LOW, MEDIUM, HIGH
    changes_files: bool = False
    requires_approval: bool = False
    binary_path: Optional[str] = None

    @abc.abstractmethod
    def execute(
        self,
        workspace_path: Path,
        arguments: Dict[str, Any],
        timeout_seconds: int = 45
    ) -> ToolExecutionResult:
        pass

    def get_definition(self) -> ToolDefinition:
        import shutil
        installed = True
        version = None
        if self.binary_path:
            installed = bool(shutil.which(self.binary_path) or Path(self.binary_path).exists())
        return ToolDefinition(
            tool_id=self.tool_id,
            name=self.name,
            purpose=self.purpose,
            risk_level=self.risk_level,
            changes_files=self.changes_files,
            requires_approval=self.requires_approval,
            input_schema={"type": "object", "properties": {"scope": {"type": "string"}}},
            output_schema={"type": "object", "properties": {"findings": {"type": "array"}}},
            installed=installed,
            binary_path=self.binary_path,
            version=version
        )

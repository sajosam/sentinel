import re
import json
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session
from app.db.models import AuditEvent


class AuditService:
    REDACTION_PATTERNS = [
        re.compile(r'(?i)(api[_-]?key|secret|password|token|bearer|private[_-]?key)[\s=:"\']+(\S+)', re.IGNORECASE),
        re.compile(r'(ghp_[a-zA-Z0-9]{36}|glpat-[a-zA-Z0-9_\-]{20}|sk-[a-zA-Z0-9]{32,})', re.IGNORECASE),
    ]

    @classmethod
    def redact(cls, text: str) -> str:
        if not text:
            return ""
        redacted = text
        for pattern in cls.REDACTION_PATTERNS:
            redacted = pattern.sub(r'\1: [REDACTED_SECRET]', redacted)
        return redacted

    @classmethod
    def redact_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        sanitized = {}
        for k, v in data.items():
            if any(term in k.lower() for term in ["secret", "password", "token", "key", "credential"]):
                sanitized[k] = "[REDACTED_SECRET]"
            elif isinstance(v, str):
                sanitized[k] = cls.redact(v)
            elif isinstance(v, dict):
                sanitized[k] = cls.redact_dict(v)
            elif isinstance(v, list):
                sanitized[k] = [cls.redact(item) if isinstance(item, str) else item for item in v]
            else:
                sanitized[k] = v
        return sanitized

    @classmethod
    def record_event(
        cls,
        db: Session,
        event_type: str,
        action: str,
        decision: str = "ALLOW",
        reason: str = "",
        workspace_id: Optional[str] = None,
        investigation_id: Optional[str] = None,
        source: str = "system",
        details: Optional[Dict[str, Any]] = None
    ) -> AuditEvent:
        clean_reason = cls.redact(reason)
        clean_details = cls.redact_dict(details or {})
        
        event = AuditEvent(
            workspace_id=workspace_id,
            investigation_id=investigation_id,
            event_type=event_type,
            source=source,
            action=action,
            decision=decision,
            reason=clean_reason,
            details=clean_details
        )
        db.add(event)
        db.commit()
        db.refresh(event)
        return event

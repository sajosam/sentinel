import datetime
import uuid
from typing import Optional
from sqlalchemy import (
    Column,
    String,
    Integer,
    Boolean,
    DateTime,
    Text,
    ForeignKey,
    JSON,
    Float,
)
from sqlalchemy.orm import relationship
from app.db.session import Base


def generate_uuid() -> str:
    return str(uuid.uuid4())


def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)


class Workspace(Base):
    __tablename__ = "workspaces"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    display_name = Column(String(255), nullable=False)
    canonical_path = Column(String(1024), nullable=False, unique=True)
    project_type = Column(String(64), default="unknown")
    protected_paths = Column(JSON, default=list)
    excluded_paths = Column(JSON, default=list)
    enabled_checks = Column(JSON, default=lambda: ["secrets", "sast", "dependencies", "prompt_shield"])
    last_analyzed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    policies = relationship("Policy", back_populates="workspace", cascade="all, delete-orphan")
    investigations = relationship("Investigation", back_populates="workspace", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="workspace", cascade="all, delete-orphan")
    audit_events = relationship("AuditEvent", back_populates="workspace", cascade="all, delete-orphan")


class Policy(Base):
    __tablename__ = "policies"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    mode = Column(String(32), default="shield")  # shield, monitor, permissive
    blocked_tools = Column(JSON, default=list)
    blocked_patterns = Column(JSON, default=list)
    allowed_write_paths = Column(JSON, default=list)
    require_approval_tools = Column(JSON, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    workspace = relationship("Workspace", back_populates="policies")


class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    goal = Column(String(512), nullable=False)
    status = Column(String(32), default="pending")  # pending, planning, running, completed, failed, cancelled
    plan = Column(JSON, default=dict)
    summary = Column(Text, default="")
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    workspace = relationship("Workspace", back_populates="investigations")
    steps = relationship("InvestigationStep", back_populates="investigation", cascade="all, delete-orphan")
    tool_runs = relationship("ToolRun", back_populates="investigation", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="investigation", cascade="all, delete-orphan")
    attack_paths = relationship("AttackPath", back_populates="investigation", cascade="all, delete-orphan")


class InvestigationStep(Base):
    __tablename__ = "investigation_steps"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    step_index = Column(Integer, nullable=False)
    step_type = Column(String(64), nullable=False)  # planning, tool_execution, reasoning, verification
    status = Column(String(32), default="running")  # running, completed, failed, skipped
    tool_name = Column(String(64), nullable=True)
    tool_input = Column(JSON, default=dict)
    tool_output = Column(JSON, default=dict)
    reasoning = Column(Text, default="")
    created_at = Column(DateTime, default=utc_now)
    completed_at = Column(DateTime, nullable=True)

    investigation = relationship("Investigation", back_populates="steps")


class ToolRun(Base):
    __tablename__ = "tool_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=True)
    tool_name = Column(String(64), nullable=False)
    command_line = Column(String(1024), nullable=True)
    arguments = Column(JSON, default=dict)
    exit_code = Column(Integer, nullable=True)
    stdout = Column(Text, default="")
    stderr = Column(Text, default="")
    duration_ms = Column(Integer, default=0)
    is_policy_allowed = Column(Boolean, default=True)
    policy_reason = Column(String(512), default="Allowed by workspace policy")
    created_at = Column(DateTime, default=utc_now)

    investigation = relationship("Investigation", back_populates="tool_runs")


class Finding(Base):
    __tablename__ = "findings"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="SET NULL"), nullable=True)
    title = Column(String(255), nullable=False)
    category = Column(String(64), nullable=False)  # secret, sast, dependency, prompt_injection, policy_violation
    severity = Column(String(32), nullable=False)  # CRITICAL, HIGH, MEDIUM, LOW, INFO
    confidence = Column(String(32), default="CONFIRMED")  # CONFIRMED, HIGH, SUSPECTED
    file_path = Column(String(1024), nullable=True)
    line_number = Column(Integer, nullable=True)
    rule_id = Column(String(128), nullable=True)
    description = Column(Text, default="")
    impact = Column(Text, default="")
    remediation = Column(Text, default="")
    verification_status = Column(String(32), default="unverified")  # unverified, fix_proposed, verified_fixed, unresolved
    is_suppressed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=utc_now)

    workspace = relationship("Workspace", back_populates="findings")
    investigation = relationship("Investigation", back_populates="findings")
    evidence_items = relationship("Evidence", back_populates="finding", cascade="all, delete-orphan")
    remediations = relationship("RemediationRun", back_populates="finding", cascade="all, delete-orphan")
    verifications = relationship("VerificationRun", back_populates="finding", cascade="all, delete-orphan")


class Evidence(Base):
    __tablename__ = "evidence"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="SET NULL"), nullable=True)
    evidence_type = Column(String(64), nullable=False)  # tool_output, code_snippet, stack_trace, raw_match
    content = Column(Text, nullable=False)
    metadata_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

    finding = relationship("Finding", back_populates="evidence_items")


class AttackPath(Base):
    __tablename__ = "attack_paths"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, default="")
    risk_score = Column(Float, default=0.0)
    created_at = Column(DateTime, default=utc_now)

    investigation = relationship("Investigation", back_populates="attack_paths")
    nodes = relationship("AttackPathNode", back_populates="attack_path", cascade="all, delete-orphan")
    edges = relationship("AttackPathEdge", back_populates="attack_path", cascade="all, delete-orphan")


class AttackPathNode(Base):
    __tablename__ = "attack_path_nodes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attack_path_id = Column(String(36), ForeignKey("attack_paths.id", ondelete="CASCADE"), nullable=False)
    node_type = Column(String(64), nullable=False)  # source_file, api_endpoint, secret, database, dependency, vulnerability
    label = Column(String(255), nullable=False)
    details = Column(JSON, default=dict)

    attack_path = relationship("AttackPath", back_populates="nodes")


class AttackPathEdge(Base):
    __tablename__ = "attack_path_edges"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    attack_path_id = Column(String(36), ForeignKey("attack_paths.id", ondelete="CASCADE"), nullable=False)
    source_node_id = Column(String(36), nullable=False)
    target_node_id = Column(String(36), nullable=False)
    relation_type = Column(String(64), nullable=False)  # uses, calls, depends_on, reads, writes, exposes, potentially_reaches
    is_inferred = Column(Boolean, default=False)
    evidence_reference = Column(String(512), nullable=True)

    attack_path = relationship("AttackPath", back_populates="edges")


class RemediationRun(Base):
    __tablename__ = "remediation_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=False)
    proposed_patch = Column(Text, nullable=False)
    patch_summary = Column(Text, default="")
    target_file = Column(String(1024), nullable=False)
    status = Column(String(32), default="proposed")  # proposed, applied, reverted, rejected
    backup_file_content = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    applied_at = Column(DateTime, nullable=True)

    finding = relationship("Finding", back_populates="remediations")


class VerificationRun(Base):
    __tablename__ = "verification_runs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    finding_id = Column(String(36), ForeignKey("findings.id", ondelete="CASCADE"), nullable=False)
    remediation_id = Column(String(36), ForeignKey("remediation_runs.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), default="pending")  # pending, running, passed, failed, inconclusive
    before_check_result = Column(JSON, default=dict)
    after_check_result = Column(JSON, default=dict)
    test_output = Column(Text, default="")
    message = Column(Text, default="")
    created_at = Column(DateTime, default=utc_now)

    finding = relationship("Finding", back_populates="verifications")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    workspace_id = Column(String(36), ForeignKey("workspaces.id", ondelete="CASCADE"), nullable=True)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(64), nullable=False)  # investigation_started, tool_executed, policy_decision, action_denied, finding_created, patch_applied, verification_completed
    source = Column(String(64), default="system")  # system, agent, user, scanner
    action = Column(String(255), nullable=False)
    decision = Column(String(32), default="ALLOW")  # ALLOW, DENY, REQUIRE_APPROVAL
    reason = Column(Text, default="")
    details = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

    workspace = relationship("Workspace", back_populates="audit_events")


class ModelUsage(Base):
    __tablename__ = "model_usage"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    investigation_id = Column(String(36), ForeignKey("investigations.id", ondelete="SET NULL"), nullable=True)
    provider = Column(String(64), default="meta")
    model_name = Column(String(128), default="llama-3.3-70b-versatile")
    prompt_tokens = Column(Integer, default=0)
    completion_tokens = Column(Integer, default=0)
    latency_ms = Column(Integer, default=0)
    status = Column(String(32), default="success")
    created_at = Column(DateTime, default=utc_now)

export interface Workspace {
  id: string;
  display_name: string;
  canonical_path: string;
  project_type: string;
  protected_paths: string[];
  excluded_paths: string[];
  enabled_checks: string[];
  last_analyzed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Policy {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  mode: 'shield' | 'monitor' | 'permissive';
  blocked_tools: string[];
  blocked_patterns: string[];
  allowed_write_paths: string[];
  require_approval_tools: string[];
  is_active: boolean;
  created_at: string;
}

export interface InvestigationStep {
  id: string;
  step_index: number;
  step_type: string;
  status: 'running' | 'completed' | 'failed' | 'skipped';
  tool_name?: string;
  tool_input: Record<string, any>;
  tool_output: Record<string, any>;
  reasoning: string;
  created_at: string;
  completed_at?: string;
}

export interface Investigation {
  id: string;
  workspace_id: string;
  goal: string;
  status: 'pending' | 'planning' | 'running' | 'completed' | 'failed' | 'cancelled';
  plan: {
    goal?: string;
    steps?: Array<{ tool: string; reason: string; expected_evidence?: string }>;
    success_criteria?: string[];
  };
  summary: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
  steps: InvestigationStep[];
}

export interface Evidence {
  id: string;
  finding_id: string;
  evidence_type: string;
  content: string;
  metadata_json: Record<string, any>;
  created_at: string;
}

export interface Finding {
  id: string;
  workspace_id: string;
  investigation_id?: string;
  title: string;
  category: 'secret' | 'sast' | 'dependency' | 'prompt_injection' | 'policy_violation';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
  confidence: 'CONFIRMED' | 'HIGH' | 'SUSPECTED';
  file_path?: string;
  line_number?: number;
  rule_id?: string;
  description: string;
  impact: string;
  remediation: string;
  verification_status: 'unverified' | 'fix_proposed' | 'verified_fixed' | 'unresolved';
  is_suppressed: boolean;
  created_at: string;
  evidence_items?: Evidence[];
}

export interface AttackPathNode {
  id: string;
  node_type: 'source_file' | 'api_endpoint' | 'secret' | 'database' | 'dependency' | 'vulnerability';
  label: string;
  details: Record<string, any>;
}

export interface AttackPathEdge {
  id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  is_inferred: boolean;
  evidence_reference?: string;
}

export interface AttackPath {
  id: string;
  investigation_id: string;
  workspace_id: string;
  name: string;
  description: string;
  risk_score: number;
  created_at: string;
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
}

export interface Remediation {
  id: string;
  finding_id: string;
  workspace_id: string;
  proposed_patch: string;
  patch_summary: string;
  target_file: string;
  status: 'proposed' | 'applied' | 'reverted' | 'rejected';
  created_at: string;
  applied_at?: string;
}

export interface Verification {
  id: string;
  finding_id: string;
  remediation_id?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'inconclusive';
  before_check_result: Record<string, any>;
  after_check_result: Record<string, any>;
  test_output: string;
  message: string;
  created_at: string;
}

export interface AuditEvent {
  id: string;
  workspace_id?: string;
  investigation_id?: string;
  event_type: string;
  source: string;
  action: string;
  decision: 'ALLOW' | 'DENY' | 'REQUIRE_APPROVAL';
  reason: string;
  details: Record<string, any>;
  created_at: string;
}

export interface ShieldStatus {
  shield_mode_active: boolean;
  policy_mode: string;
  enforcement_tier: string;
  metrics: {
    total_events_monitored: number;
    blocked_actions: number;
    allowed_actions: number;
    pending_approvals: number;
  };
  registered_agents: Array<{
    id: string;
    name: string;
    type: string;
    status: string;
  }>;
  monitored_event_types: string[];
  strictly_blocked_operations: string[];
}

export interface SystemHealth {
  status: string;
  service: string;
  environment: string;
  scanners: {
    gitleaks: { installed: boolean; path: string };
    semgrep: { installed: boolean; path: string };
    osv_scanner: { installed: boolean; path: string };
  };
  model_gateway: {
    provider: string;
    model_name: string;
    configured: boolean;
    base_url: string;
  };
}

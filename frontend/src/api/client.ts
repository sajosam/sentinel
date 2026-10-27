import {
  Workspace,
  Policy,
  Investigation,
  Finding,
  AttackPath,
  Remediation,
  Verification,
  AuditEvent,
  ShieldStatus,
  SystemHealth
} from '../types';

const API_BASE = '/api';

export const api = {
  // Health
  getHealth: async (): Promise<SystemHealth> => {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
  },

  // Workspaces
  listWorkspaces: async (): Promise<Workspace[]> => {
    const res = await fetch(`${API_BASE}/workspaces`);
    return res.json();
  },
  createWorkspace: async (data: Partial<Workspace>): Promise<Workspace> => {
    const res = await fetch(`${API_BASE}/workspaces`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to create workspace');
    return res.json();
  },
  getWorkspace: async (id: string): Promise<Workspace> => {
    const res = await fetch(`${API_BASE}/workspaces/${id}`);
    return res.json();
  },
  browseDirectories: async (path?: string): Promise<{
    current_path: string;
    current_name: string;
    parent_path: string | null;
    folders: Array<{
      name: string;
      path: string;
      is_git: boolean;
      is_node: boolean;
      is_python: boolean;
    }>;
    quick_locations: Array<{
      name: string;
      path: string;
    }>;
  }> => {
    const url = path
      ? `${API_BASE}/workspaces/browse-dirs?path=${encodeURIComponent(path)}`
      : `${API_BASE}/workspaces/browse-dirs`;
    const res = await fetch(url);
    return res.json();
  },
  pickDirectoryNative: async (): Promise<{ success: boolean; path?: string; name?: string; error?: string }> => {
    const res = await fetch(`${API_BASE}/workspaces/pick-dir`, { method: 'POST' });
    return res.json();
  },

  // Investigations
  listInvestigations: async (workspaceId?: string): Promise<Investigation[]> => {
    const url = workspaceId ? `${API_BASE}/investigations?workspace_id=${workspaceId}` : `${API_BASE}/investigations`;
    const res = await fetch(url);
    return res.json();
  },
  startInvestigation: async (workspaceId: string, goal?: string): Promise<Investigation> => {
    const res = await fetch(`${API_BASE}/investigations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ workspace_id: workspaceId, goal })
    });
    return res.json();
  },
  getInvestigation: async (id: string): Promise<Investigation> => {
    const res = await fetch(`${API_BASE}/investigations/${id}`);
    return res.json();
  },
  cancelInvestigation: async (id: string): Promise<Investigation> => {
    const res = await fetch(`${API_BASE}/investigations/${id}/cancel`, { method: 'POST' });
    return res.json();
  },

  // Findings
  listFindings: async (params?: { workspace_id?: string; category?: string; severity?: string }): Promise<Finding[]> => {
    const search = new URLSearchParams();
    if (params?.workspace_id) search.append('workspace_id', params.workspace_id);
    if (params?.category) search.append('category', params.category);
    if (params?.severity) search.append('severity', params.severity);
    const res = await fetch(`${API_BASE}/findings?${search.toString()}`);
    return res.json();
  },
  getFinding: async (id: string): Promise<Finding> => {
    const res = await fetch(`${API_BASE}/findings/${id}`);
    return res.json();
  },
  proposeFix: async (findingId: string): Promise<Remediation> => {
    const res = await fetch(`${API_BASE}/findings/${findingId}/fix`, { method: 'POST' });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to propose fix');
    return res.json();
  },
  verifyFix: async (findingId: string): Promise<Verification> => {
    const res = await fetch(`${API_BASE}/findings/${findingId}/verify`, { method: 'POST' });
    return res.json();
  },

  // Remediation
  getRemediations: async (findingId: string): Promise<Remediation[]> => {
    const res = await fetch(`${API_BASE}/remediation/${findingId}`);
    return res.json();
  },
  applyRemediation: async (remediationId: string): Promise<Remediation> => {
    const res = await fetch(`${API_BASE}/remediation/apply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remediation_id: remediationId })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to apply remediation');
    return res.json();
  },
  rollbackRemediation: async (remediationId: string): Promise<Remediation> => {
    const res = await fetch(`${API_BASE}/remediation/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ remediation_id: remediationId })
    });
    if (!res.ok) throw new Error((await res.json()).detail || 'Failed to rollback remediation');
    return res.json();
  },

  // ThreatLens Attack Paths
  listAttackPaths: async (workspaceId?: string): Promise<AttackPath[]> => {
    const url = workspaceId ? `${API_BASE}/attack_paths?workspace_id=${workspaceId}` : `${API_BASE}/attack_paths`;
    const res = await fetch(url);
    return res.json();
  },

  // Shield Mode / AgentFence
  getShieldStatus: async (workspaceId?: string): Promise<ShieldStatus> => {
    const url = workspaceId ? `${API_BASE}/shield/status?workspace_id=${workspaceId}` : `${API_BASE}/shield/status`;
    const res = await fetch(url);
    return res.json();
  },

  // Policies
  listPolicies: async (workspaceId?: string): Promise<Policy[]> => {
    const url = workspaceId ? `${API_BASE}/policies?workspace_id=${workspaceId}` : `${API_BASE}/policies`;
    const res = await fetch(url);
    return res.json();
  },

  // Audit
  listAudit: async (workspaceId?: string, limit: number = 50): Promise<AuditEvent[]> => {
    const url = workspaceId ? `${API_BASE}/audit?workspace_id=${workspaceId}&limit=${limit}` : `${API_BASE}/audit?limit=${limit}`;
    const res = await fetch(url);
    return res.json();
  },

  // Demo Lab Controls
  setupDemo: async (): Promise<{ status: string; workspace_id: string; workspace_name: string }> => {
    const res = await fetch(`${API_BASE}/demo/setup`, { method: 'POST' });
    return res.json();
  },
  resetDemo: async (): Promise<{ status: string; output: string }> => {
    const res = await fetch(`${API_BASE}/demo/reset`, { method: 'POST' });
    return res.json();
  },
  triggerPolicyViolation: async (): Promise<any> => {
    const res = await fetch(`${API_BASE}/demo/trigger-policy-violation`, { method: 'POST' });
    return res.json();
  }
};

import React, { useState, useEffect } from 'react';
import {
  Workspace,
  Finding,
  AttackPath,
  ShieldStatus,
  AuditEvent,
  Investigation
} from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { GraphViewer } from '../components/GraphViewer';
import { DiffViewer } from '../components/DiffViewer';
import {
  FolderGit2,
  Plus,
  Play,
  Lock,
  Calendar,
  CheckCircle2,
  Layers,
  Shield,
  ShieldAlert,
  ShieldBan,
  Bug,
  Network,
  Wrench,
  ScrollText,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Undo2
} from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  findings: Finding[];
  attackPaths: AttackPath[];
  shieldStatus: ShieldStatus | null;
  auditEvents: AuditEvent[];
  investigations: Investigation[];
  onStartAudit: () => void;
  onTriggerPolicyBlock: () => void;
  onResetDemo: () => void;
  onRefresh: () => void;
  initialSubTab?: string;
}

export type ProjectSubTab = 'overview' | 'findings' | 'protection' | 'attack_paths' | 'fix_verify' | 'activity';

export const Projects: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  findings,
  attackPaths,
  shieldStatus,
  auditEvents,
  investigations,
  onStartAudit,
  onTriggerPolicyBlock,
  onResetDemo,
  onRefresh,
  initialSubTab = 'overview'
}) => {
  const [activeTab, setActiveTab] = useState<ProjectSubTab>(initialSubTab as ProjectSubTab);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [canonicalPath, setCanonicalPath] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fix & Verify state
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    findings.length > 0 ? findings[0].id : null
  );
  const [currentRemediation, setCurrentRemediation] = useState<any | null>(null);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [verificationResult, setVerificationResult] = useState<any | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const selectedFinding = findings.find((f) => f.id === selectedFindingId) || findings[0] || null;

  useEffect(() => {
    if (selectedFinding) {
      loadRemediation(selectedFinding.id);
    }
  }, [selectedFindingId]);

  const loadRemediation = async (findingId: string) => {
    try {
      const rems = await api.getRemediations(findingId);
      if (rems && rems.length > 0) {
        setCurrentRemediation(rems[0]);
      } else {
        setCurrentRemediation(null);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canonicalPath) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await api.createWorkspace({
        display_name: displayName || 'Project Workspace',
        canonical_path: canonicalPath,
        protected_paths: ['.env', 'config.py', 'secrets.json']
      });
      setShowAddModal(false);
      setDisplayName('');
      setCanonicalPath('');
      onSelectWorkspace(created);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGenerateFix = async () => {
    if (!selectedFinding) return;
    setIsFixing(true);
    setActionMessage(null);
    try {
      const res = await api.proposeFix(selectedFinding.id);
      setCurrentRemediation(res);
      setActionMessage('Security patch generated. Review diff below before applying.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Failed to generate fix: ${e.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!currentRemediation) return;
    setIsApplying(true);
    try {
      const res = await api.applyRemediation(currentRemediation.id);
      setCurrentRemediation(res);
      setActionMessage('Patch successfully applied to workspace. Now run verification.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error applying patch: ${e.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleRunVerification = async () => {
    if (!selectedFinding) return;
    setIsVerifying(true);
    try {
      const res = await api.verifyFix(selectedFinding.id);
      setVerificationResult(res);
      setActionMessage(`Verification complete: Status = ${res.status} (${res.message || ''})`);
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Verification error: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRollback = async () => {
    if (!currentRemediation) return;
    try {
      const res = await api.rollbackRemediation(currentRemediation.id);
      setCurrentRemediation(res);
      setActionMessage('Rollback complete: File restored to original state.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Rollback failed: ${e.message}`);
    }
  };

  const openFindingsCount = findings.filter((f) => f.verification_status !== 'verified_fixed').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Project Selector & Header */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              Project Hub
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Protection: Active & Enforcing
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-sky-400" />
            <span>{currentWorkspace?.display_name || 'No Project Selected'}</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Path: {currentWorkspace?.canonical_path || 'None'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project</span>
          </button>

          <button
            onClick={onStartAudit}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/10 glow-blue transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Run Investigation</span>
          </button>
        </div>
      </div>

      {/* Workspace Switcher Tabs */}
      {workspaces.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs text-slate-500 font-medium mr-1">Switch Project:</span>
          {workspaces.map((ws) => (
            <button
              key={ws.id}
              onClick={() => onSelectWorkspace(ws)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                currentWorkspace?.id === ws.id
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 font-semibold'
                  : 'bg-slate-900/60 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {ws.display_name}
            </button>
          ))}
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="border-b border-slate-800 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'overview', label: 'Overview', icon: FolderGit2 },
          { id: 'findings', label: 'Findings', icon: Bug, count: openFindingsCount },
          { id: 'protection', label: 'Protection (Shield Mode)', icon: Shield, badge: shieldStatus?.metrics.blocked_actions ? `${shieldStatus.metrics.blocked_actions} Blocked` : undefined },
          { id: 'attack_paths', label: 'Attack Paths', icon: Network },
          { id: 'fix_verify', label: 'Fix & Verify', icon: Wrench },
          { id: 'activity', label: 'Activity', icon: ScrollText }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ProjectSubTab)}
              className={`px-4 py-2.5 text-xs font-medium border-b-2 flex items-center gap-2 transition-all ${
                isActive
                  ? 'border-sky-500 text-sky-400 bg-sky-500/5 font-semibold'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && tab.count > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-900">
                  {tab.count}
                </span>
              )}
              {tab.badge && (
                <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-rose-950 text-rose-300 border border-rose-900">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SUB-TAB 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Project Profile
              </span>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-slate-500 block text-[11px]">Type:</span>
                  <span className="font-mono text-slate-200 uppercase">{currentWorkspace?.project_type || 'Unknown'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Last Investigation:</span>
                  <span className="text-slate-300">
                    {currentWorkspace?.last_analyzed_at
                      ? new Date(currentWorkspace.last_analyzed_at).toLocaleString()
                      : 'Never'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Boundary Path:</span>
                  <span className="font-mono text-slate-300 break-all text-[11px]">{currentWorkspace?.canonical_path}</span>
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Protected Project Files
              </span>
              <p className="text-[11px] text-slate-400">
                AgentFence blocks automated tools from modifying these sensitive files:
              </p>
              <div className="space-y-1.5">
                {(currentWorkspace?.protected_paths || ['.env', 'config.py', 'protected_admin_keys.json']).map((p, idx) => (
                  <div key={idx} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/60 border border-slate-800 text-xs font-mono text-rose-300">
                    <Lock className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>{p}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                Enabled Security Scanners
              </span>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300">Secrets (Gitleaks)</span>
                  <span className="text-[10px] font-mono text-emerald-400">ENABLED</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300">Code Analysis (Semgrep)</span>
                  <span className="text-[10px] font-mono text-emerald-400">ENABLED</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300">Dependencies (OSV-Scanner)</span>
                  <span className="text-[10px] font-mono text-emerald-400">ENABLED</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-300">AI Prompt Shield</span>
                  <span className="text-[10px] font-mono text-emerald-400">ENABLED</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: Findings */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-100">Project Security Findings ({findings.length})</h3>
            <span className="text-xs text-slate-400 font-mono">{openFindingsCount} Unresolved</span>
          </div>

          {findings.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
              No findings detected. Run an autonomous investigation to scan the project.
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-slate-800 bg-[#0b101c] space-y-2 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <StatusBadge type="severity" value={f.severity} />
                        <span className="text-xs font-bold text-slate-200">{f.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {f.file_path} {f.line_number && `:${f.line_number}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge type="status" value={f.verification_status} />
                      <button
                        onClick={() => {
                          setSelectedFindingId(f.id);
                          setActiveTab('fix_verify');
                        }}
                        className="px-3 py-1 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold transition-colors"
                      >
                        Fix & Verify
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-300">{f.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 3: Protection (Shield Mode) */}
      {activeTab === 'protection' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] flex items-center justify-between">
            <div className="space-y-1">
              <div className="text-xs font-bold text-slate-100 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>AgentFence Shield Mode</span>
              </div>
              <p className="text-xs text-slate-400">
                Independent host execution gate that blocks unauthorized file modifications, traversal attacks, and unapproved commands.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onTriggerPolicyBlock}
                className="px-3.5 py-1.5 rounded-xl border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <ShieldBan className="w-3.5 h-3.5 text-rose-400" />
                <span>Trigger Scenario E Test</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Monitored Coding Agents</h4>
              <div className="space-y-2 text-xs">
                {(shieldStatus?.registered_agents || [
                  { id: 'sentinel', name: 'SentinelOS Autonomous Orchestrator', type: 'Internal', status: 'Enforcing' },
                  { id: 'antigravity', name: 'Google Antigravity IDE', type: 'IDE Integration', status: 'Monitored' },
                  { id: 'claude', name: 'Claude Code CLI', type: 'CLI Tool', status: 'Monitored' },
                  { id: 'cursor', name: 'Cursor Editor', type: 'Editor Extension', status: 'Monitored' }
                ]).map((agent) => (
                  <div key={agent.id} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-200">{agent.name}</div>
                      <div className="text-[10px] text-slate-500">{agent.type}</div>
                    </div>
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Strictly Blocked Actions</h4>
              <div className="space-y-2 text-xs">
                {(shieldStatus?.strictly_blocked_operations || [
                  'Writes to Protected Project Files (.env, config.py)',
                  'Commands with path traversal (.. / /etc / ~)',
                  'Execution of disallowed binary tools',
                  'Unapproved patch application'
                ]).map((op, idx) => (
                  <div key={idx} className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 flex items-center gap-2 text-slate-300">
                    <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                    <span>{op}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 4: Attack Paths (ThreatLens) */}
      {activeTab === 'attack_paths' && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Network className="w-4 h-4 text-sky-400" />
                <span>ThreatLens Attack Path Visualizer</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Maps how entry points connect to vulnerable files, leaked secrets, and databases.
              </p>
            </div>
          </div>
          {attackPaths.length > 0 ? (
            <GraphViewer attackPath={attackPaths[0]} />
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
              No attack path models generated yet. Run an autonomous investigation to model exploit paths.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 5: Fix & Verify */}
      {activeTab === 'fix_verify' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-emerald-400" />
                <span>Automated Fix & Verification Engine</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Propose minimal patches, review diffs, apply within workspace boundaries, and prove resolution with test reruns.
              </p>
            </div>
            {selectedFinding && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerateFix}
                  disabled={isFixing}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>{isFixing ? 'Generating...' : 'Generate Patch'}</span>
                </button>
                {currentRemediation?.proposed_patch && (
                  <button
                    onClick={handleApplyPatch}
                    disabled={isApplying}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isApplying ? 'Applying...' : 'Apply Patch'}</span>
                  </button>
                )}
                <button
                  onClick={handleRunVerification}
                  disabled={isVerifying}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <span>{isVerifying ? 'Verifying...' : 'Run Verification & Tests'}</span>
                </button>
                {currentRemediation?.status === 'applied' && (
                  <button
                    onClick={handleRollback}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    <span>Rollback</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {actionMessage && (
            <div className="p-3.5 rounded-xl border border-sky-900/60 bg-sky-950/40 text-xs text-sky-200 font-medium">
              {actionMessage}
            </div>
          )}

          {selectedFinding ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Finding Selection (Left) */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Select Issue to Fix
                </span>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {findings.map((f) => (
                    <div
                      key={f.id}
                      onClick={() => {
                        setSelectedFindingId(f.id);
                        setActionMessage(null);
                      }}
                      className={`p-3 rounded-xl border cursor-pointer transition-all text-xs space-y-1 ${
                        selectedFinding.id === f.id
                          ? 'border-sky-500 bg-sky-950/30'
                          : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <StatusBadge type="severity" value={f.severity} />
                        <StatusBadge type="status" value={f.verification_status} />
                      </div>
                      <div className="font-semibold text-slate-200 truncate">{f.title}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{f.file_path}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Diff Viewer (Right 2 cols) */}
              <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Proposed Code Patch</span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {currentRemediation?.target_file || selectedFinding.file_path}
                  </span>
                </div>
                {currentRemediation?.proposed_patch ? (
                  <DiffViewer diff={currentRemediation.proposed_patch} />
                ) : (
                  <div className="p-12 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800 space-y-2">
                    <p>No patch generated yet for this finding.</p>
                    <button
                      onClick={handleGenerateFix}
                      className="px-3.5 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold text-xs"
                    >
                      Generate Patch Now
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              No findings available to fix.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: Activity */}
      {activeTab === 'activity' && (
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
          <h3 className="text-sm font-bold text-slate-100">Project Activity History</h3>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {auditEvents.map((evt) => (
              <div key={evt.id} className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="decision" value={evt.decision} />
                    <span className="font-mono text-slate-200">{evt.action}</span>
                  </div>
                  <p className="text-slate-400">{evt.reason}</p>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(evt.created_at).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b101c] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-100">Add New Project</h3>
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950 text-rose-300 text-xs">{errorMsg}</div>
            )}
            <form onSubmit={handleCreateWorkspace} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 block mb-1">Display Name</label>
                <input
                  type="text"
                  placeholder="My Project"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-[#070b12] text-slate-200 focus:outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="text-slate-400 block mb-1">Canonical Path (Absolute Directory)</label>
                <input
                  type="text"
                  placeholder="/Users/username/projects/my-app"
                  value={canonicalPath}
                  onChange={(e) => setCanonicalPath(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-[#070b12] text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !canonicalPath}
                  className="px-4 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-semibold"
                >
                  {isSubmitting ? 'Registering...' : 'Add Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

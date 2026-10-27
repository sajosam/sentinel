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
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  Bug,
  Network,
  Wrench,
  ScrollText,
  Sparkles,
  Undo2,
  ArrowRight,
  ShieldBan
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
    <div className="max-w-5xl mx-auto space-y-8">
      {/* 1. Projects List Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Projects</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Workspaces registered under SentinelOS boundary monitoring and policy enforcement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project</span>
          </button>
        </div>

        {/* Project Table */}
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Project Name</th>
                <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Directory Path</th>
                <th className="py-2.5 px-4 font-medium">Protection</th>
                <th className="py-2.5 px-4 font-medium">Open Risks</th>
                <th className="py-2.5 px-4 font-medium hidden md:table-cell">Last Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {workspaces.map((ws) => {
                const isSelected = currentWorkspace?.id === ws.id;
                return (
                  <tr
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-slate-50 font-medium' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-900 font-medium">{ws.display_name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-slate-500 font-mono px-1.5 rounded bg-slate-200">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] truncate max-w-xs hidden sm:table-cell">
                      {ws.canonical_path}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Enforcing
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-700 font-mono">
                      {isSelected ? openFindingsCount : 0}
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 whitespace-nowrap hidden md:table-cell">
                      {ws.last_analyzed_at
                        ? new Date(ws.last_analyzed_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Selected Project Detail Hub */}
      {currentWorkspace && (
        <div className="space-y-5 pt-4">
          {/* Detail Header & Primary Action */}
          <div className="p-4 rounded-lg border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">{currentWorkspace.display_name}</h2>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                  {currentWorkspace.project_type || 'project'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {currentWorkspace.canonical_path}
              </p>
            </div>

            <button
              type="button"
              onClick={onStartAudit}
              className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Investigation</span>
            </button>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'findings', label: `Findings (${openFindingsCount})` },
              { id: 'protection', label: 'Protection Rules' },
              { id: 'attack_paths', label: 'Attack Paths' },
              { id: 'fix_verify', label: 'Fix & Verify' },
              { id: 'activity', label: 'Activity' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as ProjectSubTab)}
                  className={`px-3 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-slate-900 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Sub-Tab 1: Overview */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="text-xs font-semibold text-slate-900">Protected Project Assets</div>
                <p className="text-xs text-slate-500">
                  Writes to these sensitive files are denied by AgentFence unless explicitly approved:
                </p>
                <div className="space-y-1.5">
                  {(currentWorkspace.protected_paths || ['.env', 'config.py', 'protected_admin_keys.json']).map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200 text-xs font-mono text-slate-700">
                      <Lock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
                <div className="text-xs font-semibold text-slate-900">Active Security Checks</div>
                <p className="text-xs text-slate-500">
                  Scanners coordinated during autonomous investigations:
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-700">Gitleaks Secret Detection</span>
                    <span className="text-[11px] font-mono text-emerald-700 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-700">Semgrep Static Code Analysis (SAST)</span>
                    <span className="text-[11px] font-mono text-emerald-700 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-700">OSV Dependency Vulnerability Checker</span>
                    <span className="text-[11px] font-mono text-emerald-700 font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200">
                    <span className="text-slate-700">Prompt Shield AI Probe Tester</span>
                    <span className="text-[11px] font-mono text-emerald-700 font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Findings */}
          {activeTab === 'findings' && (
            <div className="space-y-3">
              {findings.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500 rounded-lg border border-slate-200 bg-white">
                  No security findings detected in this project.
                </div>
              ) : (
                <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
                  {findings.map((f) => (
                    <div key={f.id} className="p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="severity" value={f.severity} />
                          <span className="font-semibold text-slate-900">{f.title}</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {f.file_path} {f.line_number && `:${f.line_number}`}
                        </div>
                        <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge type="status" value={f.verification_status} />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFindingId(f.id);
                            setActiveTab('fix_verify');
                          }}
                          className="px-2.5 py-1 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium"
                        >
                          Review Fix
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 3: Protection Rules */}
          {activeTab === 'protection' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-slate-900">AgentFence Shield Mode</div>
                  <p className="text-slate-500 mt-0.5">
                    Enforcing host boundary verification and blocking prohibited file modifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onTriggerPolicyBlock}
                  className="px-3 py-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ShieldBan className="w-3.5 h-3.5" />
                  <span>Test Policy Block (Scenario E)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                  <div className="text-xs font-semibold text-slate-900">Monitored Coding Agents</div>
                  <div className="space-y-1.5 text-xs">
                    {(shieldStatus?.registered_agents || [
                      { id: 'sentinel', name: 'SentinelOS Autonomous Orchestrator', type: 'Internal', status: 'Enforcing' },
                      { id: 'antigravity', name: 'Google Antigravity IDE', type: 'IDE Integration', status: 'Monitored' },
                      { id: 'claude', name: 'Claude Code CLI', type: 'CLI Tool', status: 'Monitored' },
                      { id: 'cursor', name: 'Cursor Editor', type: 'Editor Extension', status: 'Monitored' }
                    ]).map((agent) => (
                      <div key={agent.id} className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <div className="font-medium text-slate-900">{agent.name}</div>
                          <div className="text-[10px] text-slate-500">{agent.type}</div>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-700 font-medium">
                          {agent.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-2">
                  <div className="text-xs font-semibold text-slate-900">Strictly Prohibited Operations</div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {(shieldStatus?.strictly_blocked_operations || [
                      'Writes to Protected Project Files (.env, config.py)',
                      'Commands with path traversal (.. / /etc / ~)',
                      'Execution of disallowed binary tools',
                      'Unapproved patch application'
                    ]).map((op, idx) => (
                      <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                        <span>{op}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 4: Attack Paths */}
          {activeTab === 'attack_paths' && (
            <div className="space-y-4">
              {attackPaths.length > 0 ? (
                <GraphViewer attackPath={attackPaths[0]} />
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 rounded-lg border border-slate-200 bg-white">
                  No attack paths modeled for this project yet. Run an investigation to analyze risk connections.
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 5: Fix & Verify */}
          {activeTab === 'fix_verify' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">Automated Fix & Verification</div>
                  <p className="text-slate-500 mt-0.5">
                    Generate safe code patches, apply within workspace boundaries, and prove resolution with tests.
                  </p>
                </div>
                {selectedFinding && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateFix}
                      disabled={isFixing}
                      className="px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isFixing ? 'Generating...' : 'Generate Patch'}</span>
                    </button>
                    {currentRemediation?.proposed_patch && (
                      <button
                        type="button"
                        onClick={handleApplyPatch}
                        disabled={isApplying}
                        className="px-3 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isApplying ? 'Applying...' : 'Apply Patch'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRunVerification}
                      disabled={isVerifying}
                      className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors"
                    >
                      <span>{isVerifying ? 'Verifying...' : 'Verify with Tests'}</span>
                    </button>
                    {currentRemediation?.status === 'applied' && (
                      <button
                        type="button"
                        onClick={handleRollback}
                        className="px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {actionMessage && (
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 font-medium">
                  {actionMessage}
                </div>
              )}

              {selectedFinding ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Select finding */}
                  <div className="p-3 rounded-lg border border-slate-200 bg-white space-y-2">
                    <div className="text-xs font-semibold text-slate-900 pb-1 border-b border-slate-100">
                      Select Finding
                    </div>
                    <div className="space-y-1.5 max-h-[350px] overflow-y-auto">
                      {findings.map((f) => (
                        <div
                          key={f.id}
                          onClick={() => {
                            setSelectedFindingId(f.id);
                            setActionMessage(null);
                          }}
                          className={`p-2.5 rounded border cursor-pointer text-xs transition-colors ${
                            selectedFinding.id === f.id
                              ? 'border-slate-900 bg-slate-50 font-medium'
                              : 'border-slate-200 bg-white hover:bg-slate-50/70'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <StatusBadge type="severity" value={f.severity} />
                            <StatusBadge type="status" value={f.verification_status} />
                          </div>
                          <div className="text-slate-900 truncate">{f.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{f.file_path}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diff Viewer */}
                  <div className="lg:col-span-2 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Proposed Unified Diff</span>
                      <span className="font-mono text-[11px]">{currentRemediation?.target_file || selectedFinding.file_path}</span>
                    </div>
                    {currentRemediation?.proposed_patch ? (
                      <DiffViewer diff={currentRemediation.proposed_patch} />
                    ) : (
                      <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 rounded-lg bg-white space-y-2">
                        <p>No patch generated for this finding yet.</p>
                        <button
                          type="button"
                          onClick={handleGenerateFix}
                          className="px-3 py-1.5 rounded-md bg-slate-900 text-white text-xs font-medium"
                        >
                          Generate Patch
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-slate-500 border border-slate-200 rounded-lg bg-white">
                  No findings available to patch.
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 6: Activity */}
          {activeTab === 'activity' && (
            <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="decision" value={evt.decision} />
                      <span className="font-mono text-slate-900 text-[11px]">{evt.action}</span>
                    </div>
                    <p className="text-slate-600 text-xs">{evt.reason}</p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Add Project</h3>
            {errorMsg && (
              <div className="p-2.5 rounded bg-rose-50 text-rose-700 border border-rose-200 text-xs">{errorMsg}</div>
            )}
            <form onSubmit={handleCreateWorkspace} className="space-y-3 text-xs">
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Display Name</label>
                <input
                  type="text"
                  placeholder="My Web App"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400"
                />
              </div>
              <div>
                <label className="text-slate-600 block mb-1 font-medium">Canonical Path (Absolute Directory)</label>
                <input
                  type="text"
                  placeholder="/Users/username/projects/my-app"
                  value={canonicalPath}
                  onChange={(e) => setCanonicalPath(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-slate-400 font-mono"
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !canonicalPath}
                  className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white font-medium disabled:opacity-50"
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

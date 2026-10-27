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
import { FolderSelector } from '../components/FolderSelector';
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
    <div className="max-w-5xl mx-auto space-y-7">
      {/* 1. Projects Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between pb-3 border-b border-[#283149]">
          <div>
            <h1 className="text-xl font-semibold text-[#E8ECF5] tracking-tight">Projects</h1>
            <p className="text-xs text-[#9AA6BF] mt-0.5">
              Workspaces registered under SentinelOS boundary monitoring and policy enforcement.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A68FC] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Project</span>
          </button>
        </div>

        {/* Project Table */}
        <div className="border border-[#283149] rounded-lg bg-[#141B2D] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0B1020]/60 border-b border-[#283149] text-[#9AA6BF] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Project Name</th>
                <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Directory Path</th>
                <th className="py-2.5 px-4 font-medium">Protection</th>
                <th className="py-2.5 px-4 font-medium">Open Risks</th>
                <th className="py-2.5 px-4 font-medium hidden md:table-cell">Last Scan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#283149]/60">
              {workspaces.map((ws) => {
                const isSelected = currentWorkspace?.id === ws.id;
                return (
                  <tr
                    key={ws.id}
                    onClick={() => onSelectWorkspace(ws)}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#1B243B] font-medium' : 'hover:bg-[#1B243B]/60'
                    }`}
                  >
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <FolderGit2 className="w-3.5 h-3.5 text-[#8B7CFF]" />
                        <span className="text-[#E8ECF5] font-medium">{ws.display_name}</span>
                        {isSelected && (
                          <span className="text-[10px] font-semibold text-[#8B7CFF] font-mono px-1.5 rounded bg-[#8B7CFF]/10 border border-[#8B7CFF]/30">
                            Active
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[#9AA6BF] font-mono text-[11px] truncate max-w-xs hidden sm:table-cell">
                      {ws.canonical_path}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-[#36D6B0] font-medium text-[11px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#36D6B0]" />
                        Enforcing
                      </span>
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-[#E8ECF5] font-mono">
                      {isSelected ? openFindingsCount : 0}
                    </td>
                    <td className="py-2.5 px-4 text-[#9AA6BF] whitespace-nowrap hidden md:table-cell">
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
        <div className="space-y-4 pt-2">
          {/* Detail Header & Action */}
          <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-[#E8ECF5]">{currentWorkspace.display_name}</h2>
                <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-[#0B1020] border border-[#283149] text-[#9AA6BF]">
                  {currentWorkspace.project_type || 'project'}
                </span>
              </div>
              <p className="text-xs text-[#9AA6BF] font-mono mt-0.5">
                {currentWorkspace.canonical_path}
              </p>
            </div>

            <button
              type="button"
              onClick={onStartAudit}
              className="px-3.5 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A68FC] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Investigation</span>
            </button>
          </div>

          {/* Sub-Tabs Navigation */}
          <div className="border-b border-[#283149] flex items-center gap-1 overflow-x-auto">
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
                  className={`px-3.5 py-2 text-xs font-medium border-b-2 transition-colors whitespace-nowrap ${
                    isActive
                      ? 'border-[#8B7CFF] text-[#E8ECF5] font-semibold'
                      : 'border-transparent text-[#9AA6BF] hover:text-[#E8ECF5]'
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
              <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] space-y-3">
                <div className="text-xs font-semibold text-[#E8ECF5]">Protected Project Assets</div>
                <p className="text-xs text-[#9AA6BF]">
                  Writes to these sensitive files are denied by AgentFence unless explicitly approved:
                </p>
                <div className="space-y-1.5">
                  {(currentWorkspace.protected_paths || ['.env', 'config.py', 'protected_admin_keys.json']).map((p, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 rounded bg-[#0B1020] border border-[#283149] text-xs font-mono text-[#E8ECF5]">
                      <Lock className="w-3.5 h-3.5 text-[#8B7CFF] flex-shrink-0" />
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] space-y-3">
                <div className="text-xs font-semibold text-[#E8ECF5]">Active Security Checks</div>
                <p className="text-xs text-[#9AA6BF]">
                  Scanners coordinated during autonomous investigations:
                </p>
                <div className="space-y-1.5 text-xs">
                  <div className="flex items-center justify-between p-2 rounded bg-[#0B1020] border border-[#283149]">
                    <span className="text-[#C5CEE0]">Gitleaks Secret Detection</span>
                    <span className="text-[11px] font-mono text-[#36D6B0] font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#0B1020] border border-[#283149]">
                    <span className="text-[#C5CEE0]">Semgrep Static Code Analysis (SAST)</span>
                    <span className="text-[11px] font-mono text-[#36D6B0] font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#0B1020] border border-[#283149]">
                    <span className="text-[#C5CEE0]">OSV Dependency Vulnerability Checker</span>
                    <span className="text-[11px] font-mono text-[#36D6B0] font-medium">Active</span>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded bg-[#0B1020] border border-[#283149]">
                    <span className="text-[#C5CEE0]">Prompt Shield AI Probe Tester</span>
                    <span className="text-[11px] font-mono text-[#36D6B0] font-medium">Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Tab 2: Findings */}
          {activeTab === 'findings' && (
            <div className="space-y-3">
              {findings.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#9AA6BF] rounded-lg border border-[#283149] bg-[#141B2D]">
                  No security findings detected in this project.
                </div>
              ) : (
                <div className="border border-[#283149] rounded-lg bg-[#141B2D] divide-y divide-[#283149]/60">
                  {findings.map((f) => (
                    <div key={f.id} className="p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-[#1B243B]/60 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <StatusBadge type="severity" value={f.severity} />
                          <span className="font-semibold text-[#E8ECF5]">{f.title}</span>
                        </div>
                        <div className="text-[11px] text-[#9AA6BF] font-mono">
                          {f.file_path} {f.line_number && `:${f.line_number}`}
                        </div>
                        <p className="text-xs text-[#C5CEE0] mt-1">{f.description}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <StatusBadge type="status" value={f.verification_status} />
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFindingId(f.id);
                            setActiveTab('fix_verify');
                          }}
                          className="px-2.5 py-1 rounded border border-[#283149] bg-[#1B243B] hover:bg-[#222D4A] text-[#E8ECF5] text-xs font-medium"
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
              <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-[#E8ECF5]">AgentFence Shield Mode</div>
                  <p className="text-[#9AA6BF] mt-0.5">
                    Enforcing host boundary verification and blocking prohibited file modifications.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onTriggerPolicyBlock}
                  className="px-3 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <ShieldBan className="w-3.5 h-3.5" />
                  <span>Test Policy Block (Scenario E)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] space-y-2">
                  <div className="text-xs font-semibold text-[#E8ECF5]">Monitored Coding Agents</div>
                  <div className="space-y-1.5 text-xs">
                    {(shieldStatus?.registered_agents || [
                      { id: 'sentinel', name: 'SentinelOS Autonomous Orchestrator', type: 'Internal', status: 'Enforcing' },
                      { id: 'antigravity', name: 'Google Antigravity IDE', type: 'IDE Integration', status: 'Monitored' },
                      { id: 'claude', name: 'Claude Code CLI', type: 'CLI Tool', status: 'Monitored' },
                      { id: 'cursor', name: 'Cursor Editor', type: 'Editor Extension', status: 'Monitored' }
                    ]).map((agent) => (
                      <div key={agent.id} className="p-2 rounded bg-[#0B1020] border border-[#283149] flex items-center justify-between">
                        <div>
                          <div className="font-medium text-[#E8ECF5]">{agent.name}</div>
                          <div className="text-[10px] text-[#9AA6BF]">{agent.type}</div>
                        </div>
                        <span className="text-[10px] font-mono text-[#36D6B0] font-medium">
                          {agent.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] space-y-2">
                  <div className="text-xs font-semibold text-[#E8ECF5]">Strictly Prohibited Operations</div>
                  <div className="space-y-1.5 text-xs text-[#C5CEE0]">
                    {(shieldStatus?.strictly_blocked_operations || [
                      'Writes to Protected Project Files (.env, config.py)',
                      'Commands with path traversal (.. / /etc / ~)',
                      'Execution of disallowed binary tools',
                      'Unapproved patch application'
                    ]).map((op, idx) => (
                      <div key={idx} className="p-2 rounded bg-[#0B1020] border border-[#283149] flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
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
                <div className="p-8 text-center text-xs text-[#9AA6BF] rounded-lg border border-[#283149] bg-[#141B2D]">
                  No attack paths modeled for this project yet. Run an investigation to analyze risk connections.
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 5: Fix & Verify */}
          {activeTab === 'fix_verify' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="font-semibold text-[#E8ECF5]">Automated Fix & Verification</div>
                  <p className="text-[#9AA6BF] mt-0.5">
                    Generate safe code patches, apply within workspace boundaries, and prove resolution with tests.
                  </p>
                </div>
                {selectedFinding && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleGenerateFix}
                      disabled={isFixing}
                      className="px-3 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A68FC] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{isFixing ? 'Generating...' : 'Generate Patch'}</span>
                    </button>
                    {currentRemediation?.proposed_patch && (
                      <button
                        type="button"
                        onClick={handleApplyPatch}
                        disabled={isApplying}
                        className="px-3 py-1.5 rounded-lg bg-[#36D6B0] hover:bg-[#2EC29E] text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{isApplying ? 'Applying...' : 'Apply Patch'}</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleRunVerification}
                      disabled={isVerifying}
                      className="px-3 py-1.5 rounded-lg border border-[#283149] bg-[#1B243B] hover:bg-[#222D4A] text-[#E8ECF5] text-xs font-medium transition-colors"
                    >
                      <span>{isVerifying ? 'Verifying...' : 'Verify with Tests'}</span>
                    </button>
                    {currentRemediation?.status === 'applied' && (
                      <button
                        type="button"
                        onClick={handleRollback}
                        className="px-3 py-1.5 rounded-lg border border-[#283149] bg-[#1B243B] hover:bg-[#222D4A] text-[#E8ECF5] text-xs font-medium flex items-center gap-1 transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              {actionMessage && (
                <div className="p-3 rounded-lg border border-[#8B7CFF]/30 bg-[#8B7CFF]/10 text-xs text-[#E8ECF5] font-medium">
                  {actionMessage}
                </div>
              )}

              {selectedFinding ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Select finding */}
                  <div className="p-3 rounded-lg border border-[#283149] bg-[#141B2D] space-y-2">
                    <div className="text-xs font-semibold text-[#E8ECF5] pb-1 border-b border-[#283149]">
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
                              ? 'border-[#8B7CFF] bg-[#1B243B] font-medium'
                              : 'border-[#283149] bg-[#0B1020] hover:bg-[#1B243B]/60'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <StatusBadge type="severity" value={f.severity} />
                            <StatusBadge type="status" value={f.verification_status} />
                          </div>
                          <div className="text-[#E8ECF5] truncate">{f.title}</div>
                          <div className="text-[10px] text-[#9AA6BF] font-mono truncate">{f.file_path}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diff Viewer */}
                  <div className="lg:col-span-2 space-y-2">
                    <div className="flex items-center justify-between text-xs text-[#9AA6BF]">
                      <span>Proposed Unified Diff</span>
                      <span className="font-mono text-[11px]">{currentRemediation?.target_file || selectedFinding.file_path}</span>
                    </div>
                    {currentRemediation?.proposed_patch ? (
                      <DiffViewer diff={currentRemediation.proposed_patch} />
                    ) : (
                      <div className="p-8 text-center text-xs text-[#9AA6BF] border border-[#283149] rounded-lg bg-[#141B2D] space-y-2">
                        <p>No patch generated for this finding yet.</p>
                        <button
                          type="button"
                          onClick={handleGenerateFix}
                          className="px-3 py-1.5 rounded-lg bg-[#8B7CFF] text-white text-xs font-semibold"
                        >
                          Generate Patch
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#9AA6BF] border border-[#283149] rounded-lg bg-[#141B2D]">
                  No findings available to patch.
                </div>
              )}
            </div>
          )}

          {/* Sub-Tab 6: Activity */}
          {activeTab === 'activity' && (
            <div className="border border-[#283149] rounded-lg bg-[#141B2D] divide-y divide-[#283149]/60">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="decision" value={evt.decision} />
                      <span className="font-mono text-[#E8ECF5] text-[11px]">{evt.action}</span>
                    </div>
                    <p className="text-[#C5CEE0] text-xs">{evt.reason}</p>
                  </div>
                  <span className="text-[11px] text-[#9AA6BF] font-mono whitespace-nowrap">
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Project Modal with Visual Folder Selection */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-xl bg-[#141B2D] border border-[#283149] rounded-2xl p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#283149]">
              <div>
                <h3 className="text-sm font-semibold text-[#E8ECF5]">Register New Project</h3>
                <p className="text-[11px] text-[#9AA6BF] mt-0.5">
                  Select a local workspace directory for SentinelOS to monitor and protect.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-[#9AA6BF] hover:text-[#E8ECF5] p-1 rounded-lg hover:bg-[#1B243B] transition-colors"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/30 text-xs">{errorMsg}</div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4 text-xs">
              <div>
                <label className="text-[#9AA6BF] block mb-1.5 font-medium">1. Choose Project Directory</label>
                <FolderSelector
                  selectedPath={canonicalPath}
                  onSelect={(path, name) => {
                    setCanonicalPath(path);
                    if (name && (!displayName || displayName === 'Project Workspace' || displayName === 'My Web App')) {
                      setDisplayName(name);
                    }
                  }}
                />
              </div>

              <div>
                <label className="text-[#9AA6BF] block mb-1.5 font-medium">2. Display Name</label>
                <input
                  type="text"
                  placeholder="e.g. My Web App"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#283149] bg-[#0B1020] text-[#E8ECF5] focus:outline-none focus:border-[#8B7CFF] transition-colors text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#283149]">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-1.5 rounded-lg border border-[#283149] bg-[#1B243B] text-[#E8ECF5] hover:bg-[#222D4A] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !canonicalPath}
                  className="px-4 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white font-medium disabled:opacity-50 transition-colors shadow-sm"
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

import React from 'react';
import { Workspace, Finding, AuditEvent, ShieldStatus, Investigation } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  Shield,
  ShieldAlert,
  Bug,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldBan,
  Activity,
  FolderGit2,
  Sparkles,
  ArrowRight,
  Eye,
  Lock,
  Wrench,
  Search,
  Terminal,
  HelpCircle
} from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  findings: Finding[];
  auditEvents: AuditEvent[];
  shieldStatus: ShieldStatus | null;
  investigations: Investigation[];
  isInvestigating: boolean;
  onStartAudit: () => void;
  onTriggerPolicyBlock: () => void;
  onResetDemo: () => void;
  onOpenOnboarding: () => void;
  onNavigateToTab: (tab: any, subTab?: string) => void;
  onSelectFindingForFix?: (finding: Finding) => void;
}

export const Overview: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  findings,
  auditEvents,
  shieldStatus,
  investigations,
  isInvestigating,
  onStartAudit,
  onTriggerPolicyBlock,
  onResetDemo,
  onOpenOnboarding,
  onNavigateToTab,
  onSelectFindingForFix
}) => {
  const unresolvedFindings = findings.filter((f) => f.verification_status !== 'verified_fixed');
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL' && f.verification_status !== 'verified_fixed').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH' && f.verification_status !== 'verified_fixed').length;
  const verifiedFixedCount = findings.filter((f) => f.verification_status === 'verified_fixed').length;
  const blockedActionsCount = shieldStatus?.metrics?.blocked_actions ?? 0;

  const currentInvestigation = investigations[0] || null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* 1. Header & Primary Action Bar */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-[#0a1020] to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-lg">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              Autonomous Code Defense
            </span>
            {shieldStatus?.shield_mode_active && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Shield Mode: Enforcing
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-100">
            Your security, at a glance.
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            SentinelOS protects your codebase when building with AI coding tools. It automatically scans for vulnerabilities, blocks unauthorized file changes, and verifies security fixes before code goes live.
          </p>
        </div>

        {/* Primary Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-shrink-0">
          <button
            onClick={onOpenOnboarding}
            className="px-3.5 py-2 rounded-xl border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
            <span>Quick Setup</span>
          </button>

          <button
            onClick={onStartAudit}
            disabled={isInvestigating}
            className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
              isInvestigating
                ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                : 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-sky-500/20 glow-blue'
            }`}
          >
            {isInvestigating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                <span>Scanning Project...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 fill-current" />
                <span>{workspaces.length === 0 ? 'Add Project & Start Scan' : 'Start Autonomous Scan'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Visible Current Investigation Banner (when running or recently finished) */}
      {isInvestigating && currentInvestigation && (
        <div className="p-4 rounded-xl border border-sky-500/40 bg-sky-950/30 flex items-center justify-between gap-4 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Terminal className="w-4 h-4 animate-spin" />
            </div>
            <div>
              <div className="text-xs font-bold text-sky-200 flex items-center gap-2">
                <span>Autonomous Investigation in Progress</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-900 text-sky-300">
                  {currentInvestigation.steps?.length || 0} step(s) run
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                {currentInvestigation.goal || 'Investigating project security posture...'}
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('investigations')}
            className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors flex-shrink-0"
          >
            <span>View Live Progress</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Four Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Protected Projects"
          value={workspaces.length}
          subtitle={workspaces.length === 1 ? '1 workspace active' : `${workspaces.length} workspaces active`}
          icon={FolderGit2}
          variant={workspaces.length > 0 ? 'default' : 'warning'}
        />
        <MetricCard
          title="Security Risks"
          value={unresolvedFindings.length}
          subtitle={`${criticalCount} Critical • ${highCount} High`}
          icon={Bug}
          variant={criticalCount > 0 ? 'danger' : highCount > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Actions Blocked"
          value={blockedActionsCount}
          subtitle="Shield Mode host enforcement"
          icon={ShieldAlert}
          variant={blockedActionsCount > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          title="Investigations"
          value={investigations.length}
          subtitle={verifiedFixedCount > 0 ? `${verifiedFixedCount} verified fixed` : 'Scans completed'}
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* 4. Workflow Section: Observe -> Investigate -> Protect -> Fix & Verify */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>How SentinelOS Protects Your Code</span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              The AI reasons. Scanners gather evidence. The policy engine controls actions. The verification engine checks results.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
          {/* 1. Observe */}
          <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 space-y-1.5">
            <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-sky-950 border border-sky-800 flex items-center justify-center text-[10px]">1</span>
              <span>Observe</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Indexes workspace structure and automatically identifies sensitive assets (<code className="text-sky-300 font-mono">.env</code>, keys, credentials).
            </p>
          </div>

          {/* 2. Investigate */}
          <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 space-y-1.5">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-indigo-950 border border-indigo-800 flex items-center justify-center text-[10px]">2</span>
              <span>Investigate</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Autonomous AI agent coordinates <strong>Gitleaks</strong>, <strong>Semgrep</strong>, and <strong>OSV-Scanner</strong> to uncover hard evidence.
            </p>
          </div>

          {/* 3. Protect */}
          <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 space-y-1.5">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-rose-950 border border-rose-800 flex items-center justify-center text-[10px]">3</span>
              <span>Protect</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              <strong>AgentFence</strong> independently intercepts file edits, denying unauthorized writes to protected files and path traversal.
            </p>
          </div>

          {/* 4. Fix & Verify */}
          <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 space-y-1.5">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <span className="w-5 h-5 rounded-full bg-emerald-950 border border-emerald-800 flex items-center justify-center text-[10px]">4</span>
              <span>Fix & Verify</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-snug">
              Suggests clean code patches, applies them inside workspace boundaries, and reruns tests to prove resolution.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Main Two-Column Content: Active Discovered Findings + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Top Discovered Findings (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100">Discovered Security Findings</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                  {unresolvedFindings.length} open
                </span>
              </div>
              <button
                onClick={() => onNavigateToTab('findings')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                <span>View All ({findings.length})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {findings.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-400 rounded-xl border border-dashed border-slate-800 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <p className="font-semibold text-slate-200">No security findings recorded yet.</p>
                <p className="text-slate-500">Run an autonomous investigation to scan your codebase for secrets and bugs.</p>
                <button
                  onClick={onStartAudit}
                  className="mt-2 px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start First Scan</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                {findings.slice(0, 5).map((finding) => (
                  <div
                    key={finding.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/70 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge type="severity" value={finding.severity} />
                        <span className="text-xs font-semibold text-slate-200 truncate">{finding.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                        <span>{finding.file_path} {finding.line_number && `:${finding.line_number}`}</span>
                        {finding.rule_id && (
                          <span className="text-slate-500 truncate max-w-[200px]">({finding.rule_id})</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge type="status" value={finding.verification_status} />
                      <button
                        onClick={() => {
                          if (onSelectFindingForFix) onSelectFindingForFix(finding);
                          else onNavigateToTab('projects', 'fix_verify');
                        }}
                        className="px-2.5 py-1 rounded-lg border border-sky-800 bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 text-xs font-medium transition-colors"
                      >
                        Fix & Verify
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Demo Helpers */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Test against isolated demo targets:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={onTriggerPolicyBlock}
                className="px-2.5 py-1 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <ShieldBan className="w-3 h-3 text-rose-400" />
                <span>Test Policy Block</span>
              </button>
              <button
                onClick={onResetDemo}
                className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3 text-slate-400" />
                <span>Reset Lab</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Activity Feed (1 col) */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100">Recent Activity</h3>
              </div>
              <button
                onClick={() => onNavigateToTab('activity')}
                className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
              >
                <span>View Full Log</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {auditEvents.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 rounded-xl border border-dashed border-slate-800">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                {auditEvents.slice(0, 6).map((evt) => (
                  <div
                    key={evt.id}
                    className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <StatusBadge type="decision" value={evt.decision} />
                      <span className="text-[10px] text-slate-500 font-mono">
                        {new Date(evt.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="font-mono text-slate-300 text-[11px] truncate">{evt.action}</div>
                    <p className="text-[11px] text-slate-400 leading-snug line-clamp-2">{evt.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
            <span>Enforcement: <strong className="text-slate-300">Host Execution Gate</strong></span>
            <span className="text-emerald-400 font-medium">Policy Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};

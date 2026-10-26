import React from 'react';
import { Workspace, Finding, AuditEvent, ShieldStatus } from '../types';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import {
  ShieldAlert,
  Bug,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ShieldBan,
  Activity,
  FolderGit2
} from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  findings: Finding[];
  auditEvents: AuditEvent[];
  shieldStatus: ShieldStatus | null;
  onStartAudit: () => void;
  onTriggerPolicyBlock: () => void;
  onResetDemo: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const Overview: React.FC<Props> = ({
  workspaces,
  findings,
  auditEvents,
  shieldStatus,
  onStartAudit,
  onTriggerPolicyBlock,
  onResetDemo,
  onNavigateToTab,
}) => {
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH').length;
  const verifiedFixedCount = findings.filter((f) => f.verification_status === 'verified_fixed').length;
  const blockedActionsCount = shieldStatus?.metrics.blocked_actions || 0;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900/90 via-sky-950/20 to-slate-900/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs uppercase tracking-wider font-semibold text-sky-400">Autonomous Code Defense</span>
          <h2 className="text-xl font-bold text-slate-100 mt-1">Autonomous AI Security Orchestrator</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            SentinelOS protects local developer environments while using AI coding tools. Multi-step LangGraph reasoning coordinates Gitleaks, Semgrep, and OSV-Scanner under independent policy enforcement.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onStartAudit}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-2 shadow-lg shadow-sky-500/10 glow-blue transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Start Investigation</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Critical Vulnerabilities"
          value={criticalCount}
          subtitle="Secrets & Code Injections"
          icon={AlertTriangle}
          variant={criticalCount > 0 ? 'danger' : 'default'}
        />
        <MetricCard
          title="High Severity Findings"
          value={highCount}
          subtitle="Input Taint & AI Injection"
          icon={Bug}
          variant={highCount > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          title="Verified Security Fixes"
          value={verifiedFixedCount}
          subtitle="Re-scanned & Test Passed"
          icon={CheckCircle2}
          variant="success"
        />
        <MetricCard
          title="Shield Mode Blocks"
          value={blockedActionsCount}
          subtitle="Policy Enforced at Host"
          icon={ShieldAlert}
          variant={blockedActionsCount > 0 ? 'danger' : 'default'}
        />
      </div>

      {/* Middle Row: Quick Scenarios + Recent Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hackathon Demo Scenarios Card */}
        <div className="p-5 rounded-xl border border-slate-800 bg-[#0b101c] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-sky-400" />
                <span>Security Lab Scenarios</span>
              </h3>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">Ready</span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Controlled testbed for instant demonstration without modifying source code.
            </p>

            <div className="mt-4 space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">Scenario A: Exposed Credential</span>
                <span className="text-[10px] font-mono text-rose-400">Gitleaks</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">Scenario B: Vulnerable urllib3</span>
                <span className="text-[10px] font-mono text-amber-400">OSV-Scanner</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">Scenario C: SQL Injection</span>
                <span className="text-[10px] font-mono text-sky-400">Semgrep</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">Scenario D: Prompt Injection</span>
                <span className="text-[10px] font-mono text-purple-400">Prompt Shield</span>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-300">Scenario E: Policy Denial</span>
                <span className="text-[10px] font-mono text-rose-400">AgentFence</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center gap-2">
            <button
              onClick={onTriggerPolicyBlock}
              className="flex-1 py-1.5 px-3 rounded-lg border border-rose-900/60 bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <ShieldBan className="w-3.5 h-3.5" />
              <span>Test Policy Block</span>
            </button>
            <button
              onClick={onResetDemo}
              className="py-1.5 px-3 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Lab</span>
            </button>
          </div>
        </div>

        {/* Live Discovered Findings List */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-800 bg-[#0b101c]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Bug className="w-4 h-4 text-rose-400" />
              <span>Active Discovered Findings</span>
            </h3>
            <button
              onClick={() => onNavigateToTab('findings')}
              className="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              View All ({findings.length}) &rarr;
            </button>
          </div>

          {findings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 rounded-lg border border-dashed border-slate-800">
              No findings recorded yet. Click "Start Investigation" to begin scanning with real security tools.
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {findings.slice(0, 5).map((finding) => (
                <div
                  key={finding.id}
                  onClick={() => onNavigateToTab('findings')}
                  className="p-3 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 cursor-pointer transition-colors flex items-center justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <StatusBadge type="severity" value={finding.severity} />
                      <span className="text-xs font-semibold text-slate-200">{finding.title}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono">
                      {finding.file_path} {finding.line_number && `:${finding.line_number}`}
                    </div>
                  </div>
                  <StatusBadge type="status" value={finding.verification_status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Audit Activity Feed */}
      <div className="p-5 rounded-xl border border-slate-800 bg-[#0b101c]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Recent Audit & Gatekeeper Timeline</span>
          </h3>
          <button
            onClick={() => onNavigateToTab('audit')}
            className="text-xs text-sky-400 hover:text-sky-300 font-medium"
          >
            Open Full Audit Log &rarr;
          </button>
        </div>

        <div className="space-y-2 max-h-[220px] overflow-y-auto">
          {auditEvents.slice(0, 5).map((evt) => (
            <div key={evt.id} className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/50 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <StatusBadge type="decision" value={evt.decision} />
                <span className="font-mono text-slate-300 text-[11px]">{evt.action}</span>
                <span className="text-slate-400 text-xs truncate max-w-md">{evt.reason}</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {new Date(evt.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

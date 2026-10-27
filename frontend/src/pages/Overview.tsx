import React, { useState } from 'react';
import { Workspace, Finding, AuditEvent, ShieldStatus, Investigation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FolderGit2,
  Play,
  ArrowRight,
  ShieldCheck,
  Plus,
  Sparkles,
  CheckCircle2,
  Terminal,
  Clock,
  ShieldAlert,
  Target
} from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  findings: Finding[];
  auditEvents: AuditEvent[];
  shieldStatus: ShieldStatus | null;
  investigations: Investigation[];
  isInvestigating: boolean;
  onStartAudit: (goal?: string) => void;
  onOpenOnboarding: () => void;
  onNavigateToTab: (tab: any, subTab?: string) => void;
  onSelectFindingForFix?: (finding: Finding) => void;
}

const DEFAULT_GOAL = "Investigate the most serious security risks and fix one verified issue.";

const QUICK_GOALS = [
  "Investigate SQL injection",
  "Check for exposed secrets",
  "Verify and fix vulnerabilities",
  "Audit dependencies for CVEs"
];

export const Overview: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  findings,
  auditEvents,
  shieldStatus,
  investigations,
  isInvestigating,
  onStartAudit,
  onOpenOnboarding,
  onNavigateToTab,
  onSelectFindingForFix,
}) => {
  const [goalText, setGoalText] = useState<string>(DEFAULT_GOAL);

  // Empty state when no workspace exists
  if (workspaces.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-20 text-center space-y-4 p-8 rounded-xl border border-[#283149] bg-[#141B2D]">
        <div className="w-12 h-12 rounded-lg bg-[#1B243B] border border-[#283149] flex items-center justify-center text-[#8B7CFF] mx-auto">
          <FolderGit2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#E8ECF5]">No project configured</h2>
          <p className="text-xs text-[#9AA6BF] mt-1 max-w-sm mx-auto">
            Select a project directory to enable autonomous scanning, secret detection, and AgentFence boundary protection.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A68FC] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Select Project</span>
        </button>
      </div>
    );
  }

  const unresolvedFindings = findings.filter((f) => f.verification_status !== 'verified_fixed');
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL' && f.verification_status !== 'verified_fixed').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH' && f.verification_status !== 'verified_fixed').length;
  const verifiedFixedCount = findings.filter((f) => f.verification_status === 'verified_fixed').length;
  const completedInvestigationsCount = investigations.filter((i) => i.status === 'completed').length;
  const currentInvestigation = investigations[0] || null;

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* 1. Hero & Autonomous Goal Section */}
      <div className="p-6 rounded-xl border border-[#283149] bg-[#141B2D] space-y-5">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#8B7CFF]/10 border border-[#8B7CFF]/20 text-[#8B7CFF] text-[11px] font-semibold mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Autonomous AI Security Engineer</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#E8ECF5]">
            One goal. Autonomous investigation. Verified results.
          </h1>
          <p className="text-xs text-[#9AA6BF] max-w-2xl leading-relaxed">
            SentinelOS autonomously investigates your codebase, correlates isolated alerts into actionable attack paths, generates targeted fixes, and verifies them with tests and re-scanners.
          </p>
        </div>

        {/* Interactive Goal Input */}
        <div className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Target className="w-4 h-4 text-[#8B7CFF] absolute left-3 top-3" />
              <input
                type="text"
                value={goalText}
                onChange={(e) => setGoalText(e.target.value)}
                placeholder="Enter a security investigation goal..."
                disabled={isInvestigating}
                className="w-full bg-[#0B1020] border border-[#283149] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#E8ECF5] placeholder-[#9AA6BF]/50 focus:outline-none focus:border-[#8B7CFF] transition-colors"
              />
            </div>
            <button
              type="button"
              onClick={() => onStartAudit(goalText)}
              disabled={isInvestigating}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all flex-shrink-0 shadow-sm ${
                isInvestigating
                  ? 'bg-[#1B243B] text-[#9AA6BF] border border-[#283149] cursor-not-allowed'
                  : 'bg-[#8B7CFF] hover:bg-[#7A68FC] text-white'
              }`}
            >
              {isInvestigating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-[#9AA6BF] border-t-transparent rounded-full animate-spin" />
                  <span>Investigating...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Start Autonomous Investigation</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Goal Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-[#9AA6BF] font-medium mr-1">Quick Goals:</span>
            {QUICK_GOALS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setGoalText(q)}
                disabled={isInvestigating}
                className="px-2.5 py-1 rounded-md text-[11px] bg-[#0B1020] border border-[#283149] text-[#9AA6BF] hover:text-[#E8ECF5] hover:border-[#8B7CFF]/50 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Current Active Project & Shield Status */}
        {currentWorkspace && (
          <div className="pt-3 border-t border-[#283149]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-[#9AA6BF]">Active Project:</span>
              <span className="font-semibold text-[#E8ECF5]">{currentWorkspace.display_name}</span>
              <span className="text-[#9AA6BF] font-mono text-[11px] hidden sm:inline">({currentWorkspace.canonical_path})</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#36D6B0]/30 bg-[#36D6B0]/10 text-[#36D6B0] font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#36D6B0]" />
                Shield Mode: Enforcing
              </span>
              <span className="text-[#9AA6BF] text-[11px] hidden md:inline">
                Last analyzed: {currentWorkspace.last_analyzed_at
                  ? new Date(currentWorkspace.last_analyzed_at).toLocaleDateString()
                  : 'Ready'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Investigation Banner (Only when actively scanning) */}
      {isInvestigating && currentInvestigation && (
        <div className="p-3.5 rounded-lg border border-[#8B7CFF]/40 bg-[#8B7CFF]/10 flex items-center justify-between text-xs text-[#E8ECF5] animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#8B7CFF] animate-ping" />
            <span className="font-medium text-[#8B7CFF]">Autonomous Investigation in progress:</span>
            <span className="text-[#C5CEE0] truncate max-w-md">{currentInvestigation.goal}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('investigations')}
            className="text-[#8B7CFF] hover:text-white font-medium flex items-center gap-1"
          >
            <span>View Live Workflow</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Three Primary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Metric 1: Open Risks */}
        <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D]">
          <div className="text-xs font-medium text-[#9AA6BF]">Open Risks</div>
          <div className="mt-2 text-2xl font-bold text-[#E8ECF5] tracking-tight">
            {unresolvedFindings.length}
          </div>
          <p className="mt-1 text-xs text-[#9AA6BF]">
            {criticalCount > 0 || highCount > 0
              ? `${criticalCount} Critical • ${highCount} High`
              : 'No high-severity risks'}
          </p>
        </div>

        {/* Metric 2: Investigations Completed */}
        <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D]">
          <div className="text-xs font-medium text-[#9AA6BF]">Investigations Completed</div>
          <div className="mt-2 text-2xl font-bold text-[#8B7CFF] tracking-tight">
            {completedInvestigationsCount}
          </div>
          <p className="mt-1 text-xs text-[#9AA6BF]">
            Multi-step closed-loop runs
          </p>
        </div>

        {/* Metric 3: Verified Fixes */}
        <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D]">
          <div className="text-xs font-medium text-[#9AA6BF]">Verified Fixes</div>
          <div className="mt-2 text-2xl font-bold text-[#36D6B0] tracking-tight">
            {verifiedFixedCount}
          </div>
          <p className="mt-1 text-xs text-[#9AA6BF]">
            Re-scanned & regression test passed
          </p>
        </div>
      </div>

      {/* 3. Latest Investigation Result Summary Card */}
      {currentInvestigation && (
        <div className="p-5 rounded-xl border border-[#283149] bg-[#141B2D] space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Terminal className="w-4 h-4 text-[#8B7CFF]" />
              <h2 className="text-sm font-semibold text-[#E8ECF5]">Latest Investigation Result</h2>
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase border ${
                currentInvestigation.status === 'completed'
                  ? 'bg-[#36D6B0]/10 text-[#36D6B0] border-[#36D6B0]/20'
                  : 'bg-[#8B7CFF]/10 text-[#8B7CFF] border-[#8B7CFF]/20 animate-pulse'
              }`}>
                {currentInvestigation.status}
              </span>
            </div>
            <button
              type="button"
              onClick={() => onNavigateToTab('investigations')}
              className="text-xs text-[#8B7CFF] hover:text-[#A79CFF] font-medium flex items-center gap-1"
            >
              <span>View Investigation Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0B1020] border border-[#283149] space-y-1.5 text-xs">
            <div className="text-[#9AA6BF] flex items-center gap-2">
              <span className="text-[10px] uppercase font-semibold text-[#8B7CFF]">Goal:</span>
              <span className="text-[#E8ECF5] font-medium">{currentInvestigation.goal}</span>
            </div>
            {currentInvestigation.summary && (
              <p className="text-[#9AA6BF] leading-relaxed text-[11px] pt-1">
                {currentInvestigation.summary}
              </p>
            )}
            <div className="pt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#9AA6BF] font-mono border-t border-[#283149]/50">
              <span>Steps Executed: {currentInvestigation.steps?.length || 0}</span>
              <span>•</span>
              <span>Verified Fixes: {verifiedFixedCount}</span>
              <span>•</span>
              <span>Started: {new Date(currentInvestigation.created_at).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Prioritized "Needs Attention" Findings List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-[#E8ECF5]">Needs Attention</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#1B243B] text-[#9AA6BF]">
              {unresolvedFindings.length} issues
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('findings')}
            className="text-xs text-[#8B7CFF] hover:text-[#A79CFF] font-medium flex items-center gap-1"
          >
            <span>View all findings ({findings.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {findings.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9AA6BF] rounded-lg border border-[#283149] bg-[#141B2D]">
            No security findings recorded yet. Click "Start Autonomous Investigation" to begin.
          </div>
        ) : (
          <div className="border border-[#283149] rounded-lg bg-[#141B2D] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#0B1020]/60 border-b border-[#283149] text-[#9AA6BF] font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Vulnerability</th>
                  <th className="py-2.5 px-4 font-medium hidden md:table-cell">Location</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#283149]/60">
                {findings.slice(0, 5).map((f) => (
                  <tr key={f.id} className="hover:bg-[#1B243B]/60 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge type="severity" value={f.severity} />
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#E8ECF5]">
                      <div>{f.title}</div>
                      <div className="text-[11px] text-[#9AA6BF] font-mono md:hidden truncate max-w-xs mt-0.5">
                        {f.file_path}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 text-[#9AA6BF] font-mono text-[11px] hidden md:table-cell">
                      {f.file_path} {f.line_number && `:${f.line_number}`}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge type="status" value={f.verification_status} />
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          if (onSelectFindingForFix) onSelectFindingForFix(f);
                          else onNavigateToTab('investigations', 'fix_verify');
                        }}
                        className="text-xs text-[#8B7CFF] hover:text-[#A79CFF] font-medium hover:underline"
                      >
                        Review & Fix
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Tamper-evident Audit Activity */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E8ECF5]">Recent Activity & Enforcement</h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('investigations', 'activity')}
            className="text-xs text-[#8B7CFF] hover:text-[#A79CFF] font-medium flex items-center gap-1"
          >
            <span>View audit trail in Investigation</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {auditEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9AA6BF] rounded-lg border border-[#283149] bg-[#141B2D]">
            No activity logged yet.
          </div>
        ) : (
          <div className="border border-[#283149] rounded-lg bg-[#141B2D] divide-y divide-[#283149]/60">
            {auditEvents.slice(0, 4).map((evt) => (
              <div key={evt.id} className="p-3 flex items-start justify-between gap-3 text-xs hover:bg-[#1B243B]/40 transition-colors">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex-shrink-0">
                    <StatusBadge type="decision" value={evt.decision} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[#E8ECF5] text-xs truncate">{evt.action}</div>
                    <p className="text-[#9AA6BF] text-[11px] mt-0.5 line-clamp-1">{evt.reason}</p>
                  </div>
                </div>
                <span className="text-[11px] text-[#9AA6BF] font-mono whitespace-nowrap flex-shrink-0">
                  {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

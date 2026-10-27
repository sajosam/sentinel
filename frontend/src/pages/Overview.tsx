import React from 'react';
import { Workspace, Finding, AuditEvent, ShieldStatus, Investigation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FolderGit2,
  Play,
  ArrowRight,
  ShieldCheck,
  Plus,
  Sparkles,
  AlertCircle
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
  onOpenOnboarding,
  onNavigateToTab,
  onSelectFindingForFix,
}) => {
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
            Add a project directory to enable autonomous scanning, secret detection, and AgentFence boundary protection.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A68FC] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Add Project</span>
        </button>
      </div>
    );
  }

  const unresolvedFindings = findings.filter((f) => f.verification_status !== 'verified_fixed');
  const criticalCount = findings.filter((f) => f.severity === 'CRITICAL' && f.verification_status !== 'verified_fixed').length;
  const highCount = findings.filter((f) => f.severity === 'HIGH' && f.verification_status !== 'verified_fixed').length;
  const verifiedFixedCount = findings.filter((f) => f.verification_status === 'verified_fixed').length;
  const blockedCount = shieldStatus?.metrics?.blocked_actions ?? 0;
  const currentInvestigation = investigations[0] || null;

  return (
    <div className="max-w-5xl mx-auto space-y-7">
      {/* 1. Strong Opening Hero Section */}
      <div className="p-6 rounded-xl border border-[#283149] bg-[#141B2D] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-[#E8ECF5]">
              Know your risks. Stay in control.
            </h1>
            <p className="text-xs text-[#9AA6BF] max-w-2xl leading-relaxed">
              Autonomous AI security that monitors coding tools, detects vulnerabilities, blocks unauthorized file modifications, and verifies fixes.
            </p>
          </div>

          {/* Prominent Run Security Scan Button */}
          <button
            type="button"
            onClick={onStartAudit}
            disabled={isInvestigating}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all flex-shrink-0 shadow-sm ${
              isInvestigating
                ? 'bg-[#1B243B] text-[#9AA6BF] border border-[#283149] cursor-not-allowed'
                : 'bg-[#8B7CFF] hover:bg-[#7A68FC] text-white'
            }`}
          >
            {isInvestigating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#9AA6BF] border-t-transparent rounded-full animate-spin" />
                <span>Scanning in progress...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run Security Scan</span>
              </>
            )}
          </button>
        </div>

        {/* Current Project and Protection Status Bar */}
        {currentWorkspace && (
          <div className="pt-3 border-t border-[#283149]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <span className="text-[#9AA6BF]">Active Workspace:</span>
              <span className="font-semibold text-[#E8ECF5]">{currentWorkspace.display_name}</span>
              <span className="text-[#9AA6BF] font-mono text-[11px] hidden sm:inline">({currentWorkspace.canonical_path})</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#36D6B0]/30 bg-[#36D6B0]/10 text-[#36D6B0] font-medium text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#36D6B0]" />
                Shield Mode: Enforcing
              </span>
              <span className="text-[#9AA6BF] text-[11px] hidden md:inline">
                Last scan: {currentWorkspace.last_analyzed_at
                  ? new Date(currentWorkspace.last_analyzed_at).toLocaleDateString()
                  : 'Never'}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Scan Banner (Only when actively scanning) */}
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
            <span>View Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Three Compact Metrics: Open Risks, Blocked Actions, Verified Fixes */}
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
              : 'No high severity vulnerabilities'}
          </p>
        </div>

        {/* Metric 2: Blocked Actions */}
        <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D]">
          <div className="text-xs font-medium text-[#9AA6BF]">Blocked Actions</div>
          <div className="mt-2 text-2xl font-bold text-[#E8ECF5] tracking-tight">
            {blockedCount}
          </div>
          <p className="mt-1 text-xs text-[#9AA6BF]">
            Enforced by AgentFence gatekeeper
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

      {/* 3. Clean "Needs Attention" Findings List */}
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
            No security findings recorded. Click "Run Security Scan" to investigate your project.
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
                          else onNavigateToTab('findings');
                        }}
                        className="text-xs text-[#8B7CFF] hover:text-[#A79CFF] font-medium hover:underline"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 4. Compact Recent Activity Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E8ECF5]">Recent Activity</h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('activity')}
            className="text-xs text-[#8B7CFF] hover:text-[#A79CFF] font-medium flex items-center gap-1"
          >
            <span>View full log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {auditEvents.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#9AA6BF] rounded-lg border border-[#283149] bg-[#141B2D]">
            No activity logged yet.
          </div>
        ) : (
          <div className="border border-[#283149] rounded-lg bg-[#141B2D] divide-y divide-[#283149]/60">
            {auditEvents.slice(0, 5).map((evt) => (
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

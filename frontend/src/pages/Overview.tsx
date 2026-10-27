import React from 'react';
import { Workspace, Finding, AuditEvent, ShieldStatus, Investigation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FolderGit2,
  Play,
  ArrowRight,
  ShieldCheck,
  Plus
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
      <div className="max-w-xl mx-auto my-16 text-center space-y-4">
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mx-auto">
          <FolderGit2 className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">No project configured</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Add a local repository to enable autonomous scanning, secret detection, and policy enforcement.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
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
  const blockedCount = shieldStatus?.metrics?.blocked_actions ?? 0;
  const currentInvestigation = investigations[0] || null;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* 1. Page Header & Security State Sentence */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Overview</h1>
          <p className="text-xs text-slate-500 mt-1">
            {unresolvedFindings.length > 0
              ? `SentinelOS is actively enforcing protection. ${unresolvedFindings.length} open security risks require review in "${currentWorkspace?.display_name}".`
              : `All systems operational. No unresolved security risks detected in "${currentWorkspace?.display_name}".`}
          </p>
        </div>

        <button
          type="button"
          onClick={onStartAudit}
          disabled={isInvestigating}
          className={`px-3.5 py-2 rounded-md text-xs font-medium flex items-center justify-center gap-2 transition-colors flex-shrink-0 ${
            isInvestigating
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
              : 'bg-slate-900 hover:bg-slate-800 text-white shadow-sm'
          }`}
        >
          {isInvestigating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
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

      {/* 2. Live Scan Banner (Only when active) */}
      {isInvestigating && currentInvestigation && (
        <div className="p-3.5 rounded-lg border border-sky-200 bg-sky-50/70 flex items-center justify-between text-xs text-sky-900 animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-sky-600 animate-ping" />
            <span className="font-medium">Autonomous Investigation running:</span>
            <span className="text-slate-600 truncate max-w-md">{currentInvestigation.goal}</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateToTab('investigations')}
            className="text-sky-700 hover:text-sky-900 font-medium flex items-center gap-1"
          >
            <span>View Timeline</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3. Compact Current Project Summary */}
      {currentWorkspace && (
        <div className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-900">{currentWorkspace.display_name}</span>
            <span className="text-slate-400 font-mono text-[11px] truncate max-w-sm">{currentWorkspace.canonical_path}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-500">
            <span className="inline-flex items-center gap-1 text-slate-700 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Shield Mode Active
            </span>
            <span>•</span>
            <span>
              Last scanned: {currentWorkspace.last_analyzed_at
                ? new Date(currentWorkspace.last_analyzed_at).toLocaleDateString()
                : 'Never'}
            </span>
          </div>
        </div>
      )}

      {/* 4. Three Simple Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="text-xs font-medium text-slate-500">Open Risks</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tracking-tight">
            {unresolvedFindings.length}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {criticalCount > 0 || highCount > 0
              ? `${criticalCount} Critical, ${highCount} High`
              : 'No high severity risks'}
          </p>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="text-xs font-medium text-slate-500">Blocked Actions</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tracking-tight">
            {blockedCount}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Enforced by AgentFence
          </p>
        </div>

        <div className="p-4 rounded-lg border border-slate-200 bg-white">
          <div className="text-xs font-medium text-slate-500">Investigations</div>
          <div className="mt-2 text-2xl font-semibold text-slate-900 tracking-tight">
            {investigations.length}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Autonomous multi-step audits
          </p>
        </div>
      </div>

      {/* 5. Recent Findings Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent Findings</h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('findings')}
            className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1"
          >
            <span>View all ({findings.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {findings.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-lg border border-slate-200 bg-white">
            No security findings recorded. Click "Run Security Scan" to investigate your project.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                <tr>
                  <th className="py-2.5 px-4 font-medium">Severity</th>
                  <th className="py-2.5 px-4 font-medium">Finding</th>
                  <th className="py-2.5 px-4 font-medium hidden md:table-cell">File</th>
                  <th className="py-2.5 px-4 font-medium">Status</th>
                  <th className="py-2.5 px-4 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {findings.slice(0, 5).map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <StatusBadge type="severity" value={f.severity} />
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900">{f.title}</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs md:hidden font-mono mt-0.5">{f.file_path}</div>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] hidden md:table-cell">
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
                        className="text-xs text-slate-700 hover:text-slate-900 font-medium hover:underline"
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

      {/* 6. Compact Recent Activity List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Recent Activity</h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('activity')}
            className="text-xs text-slate-500 hover:text-slate-900 font-medium flex items-center gap-1"
          >
            <span>View full log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {auditEvents.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500 rounded-lg border border-slate-200 bg-white">
            No activity logged yet.
          </div>
        ) : (
          <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
            {auditEvents.slice(0, 5).map((evt) => (
              <div key={evt.id} className="p-3 flex items-start justify-between gap-3 text-xs">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5">
                    <StatusBadge type="decision" value={evt.decision} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-slate-900 text-[11px] truncate">{evt.action}</div>
                    <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">{evt.reason}</p>
                  </div>
                </div>
                <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap flex-shrink-0">
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

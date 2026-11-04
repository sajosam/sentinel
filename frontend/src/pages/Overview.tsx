import React, { useState } from 'react';
import { Workspace, Finding, AuditEvent, ShieldStatus, Investigation } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  FolderGit2,
  Play,
  ArrowRight,
  Plus,
  Target,
  ShieldCheck,
  AlertTriangle,
  Activity,
  CheckCircle2,
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
  "Audit dependencies for CVEs",
];

// Severity is a reserved STATUS ramp (not a categorical series): fixed semantic hues, always labeled.
const SEVERITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const;
const SEVERITY_COLOR: Record<string, string> = {
  CRITICAL: '#EF4444',
  HIGH: '#F97316',
  MEDIUM: '#F59E0B',
  LOW: '#60A5FA',
};
const CATEGORY_LABEL: Record<string, string> = {
  secret: 'Secrets',
  sast: 'Code (SAST)',
  dependency: 'Dependencies',
  prompt_injection: 'Prompt / AI',
};

export const Overview: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  findings,
  auditEvents,
  investigations,
  isInvestigating,
  onStartAudit,
  onOpenOnboarding,
  onNavigateToTab,
  onSelectFindingForFix,
}) => {
  const [goalText, setGoalText] = useState<string>(DEFAULT_GOAL);

  if (workspaces.length === 0) {
    return (
      <div className="max-w-xl mx-auto my-20 text-center space-y-4 p-8 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
        <div className="w-12 h-12 rounded-lg bg-[#1B222E] border border-[#232B38] flex items-center justify-center text-[#3B82F6] mx-auto">
          <FolderGit2 className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#E6EBF2]">No project configured</h2>
          <p className="text-xs text-[#8A97AC] mt-1 max-w-sm mx-auto">
            Select a project directory to enable autonomous scanning, secret detection, and AgentFence boundary protection.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2F6FE0] text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Select Project</span>
        </button>
      </div>
    );
  }

  const unresolved = findings.filter((f) => f.verification_status !== 'verified_fixed');
  const criticalCount = unresolved.filter((f) => f.severity === 'CRITICAL').length;
  const highCount = unresolved.filter((f) => f.severity === 'HIGH').length;
  const verifiedFixedCount = findings.filter((f) => f.verification_status === 'verified_fixed').length;
  const completedCount = investigations.filter((i) => i.status === 'completed').length;
  const currentInvestigation = investigations[0] || null;

  const sevCounts = SEVERITY_ORDER.map((s) => ({
    key: s,
    count: unresolved.filter((f) => (f.severity || '').toUpperCase() === s).length,
  }));
  const sevTotal = sevCounts.reduce((a, b) => a + b.count, 0);

  const catCounts = Object.keys(CATEGORY_LABEL)
    .map((c) => ({ key: c, count: findings.filter((f) => f.category === c).length }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);
  const catMax = Math.max(1, ...catCounts.map((c) => c.count));

  const posturePct = findings.length ? Math.round((verifiedFixedCount / findings.length) * 100) : 0;

  const kpis = [
    { label: 'Open risks', value: unresolved.length, icon: AlertTriangle, tone: '#E6EBF2',
      sub: criticalCount || highCount ? `${criticalCount} critical · ${highCount} high` : 'No high-severity risks' },
    { label: 'Critical', value: criticalCount, icon: ShieldCheck, tone: criticalCount ? '#EF4444' : '#E6EBF2',
      sub: 'Require immediate action' },
    { label: 'Verified fixes', value: verifiedFixedCount, icon: CheckCircle2, tone: '#10B981',
      sub: 'Re-scanned & test-proven' },
    { label: 'Investigations', value: completedCount, icon: Activity, tone: '#3B82F6',
      sub: 'Closed-loop runs' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#E6EBF2]">Security Overview</h1>
          <p className="text-xs text-[#8A97AC] mt-0.5">
            {currentWorkspace?.display_name || 'Project'}
            <span className="text-[#8A97AC]/60 font-mono ml-2 hidden sm:inline">{currentWorkspace?.canonical_path}</span>
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981] font-medium text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          Shield Mode: Enforcing
        </span>
      </div>

      {/* Investigation launcher — slim, not a hero */}
      <div className="p-3 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1">
            <Target className="w-4 h-4 text-[#3B82F6] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={goalText}
              onChange={(e) => setGoalText(e.target.value)}
              placeholder="Enter a security investigation goal..."
              disabled={isInvestigating}
              className="w-full bg-[#0A0E14] border border-[#232B38] rounded-lg pl-9 pr-3 py-2.5 text-xs text-[#E6EBF2] placeholder-[#8A97AC]/50 focus:outline-none focus:border-[#3B82F6] transition-colors"
            />
          </div>
          <button
            type="button"
            onClick={() => onStartAudit(goalText)}
            disabled={isInvestigating}
            className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors flex-shrink-0 ${
              isInvestigating
                ? 'bg-[#1B222E] text-[#8A97AC] border border-[#232B38] cursor-not-allowed'
                : 'bg-[#3B82F6] hover:bg-[#2F6FE0] text-white'
            }`}
          >
            {isInvestigating ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-[#8A97AC] border-t-transparent rounded-full animate-spin" />
                <span>Investigating…</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start Investigation</span>
              </>
            )}
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {QUICK_GOALS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setGoalText(q)}
              disabled={isInvestigating}
              className="px-2 py-0.5 rounded text-[11px] bg-[#0A0E14] border border-[#232B38] text-[#8A97AC] hover:text-[#E6EBF2] hover:border-[#3B82F6]/50 transition-colors"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {isInvestigating && currentInvestigation && (
        <button
          type="button"
          onClick={() => onNavigateToTab('investigations')}
          className="w-full p-3 rounded-lg border border-[#3B82F6]/40 bg-[#3B82F6]/10 flex items-center justify-between text-xs text-[#E6EBF2]"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#3B82F6] animate-ping flex-shrink-0" />
            <span className="font-medium text-[#3B82F6]">Investigation in progress</span>
            <span className="text-[#CBD5E6] truncate">{currentInvestigation.goal}</span>
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#3B82F6] flex-shrink-0" />
        </button>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#8A97AC] uppercase tracking-wide">{k.label}</span>
                <Icon className="w-4 h-4 text-[#8A97AC]/70" />
              </div>
              <div className="mt-2 text-3xl font-bold tracking-tight tabular-nums" style={{ color: k.tone }}>
                {k.value}
              </div>
              <p className="mt-1 text-[11px] text-[#8A97AC]">{k.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Analytics: severity distribution + remediation posture */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 p-5 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
          <h2 className="text-sm font-semibold text-[#E6EBF2]">Open risks by severity</h2>
          <p className="text-[11px] text-[#8A97AC] mt-0.5">{sevTotal} unresolved finding{sevTotal === 1 ? '' : 's'}</p>

          {sevTotal === 0 ? (
            <div className="mt-6 flex items-center gap-2 text-xs text-[#10B981]">
              <CheckCircle2 className="w-4 h-4" /> No open risks — all findings resolved.
            </div>
          ) : (
            <>
              {/* Stacked status bar: 2px surface gaps, rounded ends */}
              <div className="mt-4 flex h-3 w-full gap-[2px] rounded-full overflow-hidden" role="img"
                   aria-label={sevCounts.map((s) => `${s.key} ${s.count}`).join(', ')}>
                {sevCounts.filter((s) => s.count > 0).map((s) => (
                  <div key={s.key} style={{ width: `${(s.count / sevTotal) * 100}%`, backgroundColor: SEVERITY_COLOR[s.key] }} />
                ))}
              </div>
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {sevCounts.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: SEVERITY_COLOR[s.key] }} />
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#E6EBF2] tabular-nums leading-none">{s.count}</div>
                      <div className="text-[10px] text-[#8A97AC] uppercase tracking-wide mt-0.5">{s.key}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Remediation posture — single-hue magnitude gauge */}
        <div className="p-5 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card flex flex-col">
          <h2 className="text-sm font-semibold text-[#E6EBF2]">Remediation posture</h2>
          <div className="flex-1 flex items-center justify-center py-2">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-28 h-28 -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="#232B38" strokeWidth="9" />
                <circle
                  cx="50" cy="50" r="42" fill="none" stroke="#10B981" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${(posturePct / 100) * 2 * Math.PI * 42} ${2 * Math.PI * 42}`}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[#E6EBF2] tabular-nums leading-none">{posturePct}%</span>
                <span className="text-[10px] text-[#8A97AC] mt-1">verified fixed</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-[#8A97AC] text-center">
            {verifiedFixedCount} of {findings.length} findings closed with a re-scanned, test-proven fix.
          </p>
        </div>
      </div>

      {/* Category breakdown + Needs attention */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 p-5 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
          <h2 className="text-sm font-semibold text-[#E6EBF2] mb-4">Findings by category</h2>
          {catCounts.length === 0 ? (
            <p className="text-xs text-[#8A97AC]">No findings recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {catCounts.map((c) => (
                <div key={c.key}>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-[#E6EBF2] font-medium">{CATEGORY_LABEL[c.key]}</span>
                    <span className="text-[#8A97AC] tabular-nums">{c.count}</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-[#0A0E14] overflow-hidden">
                    <div className="h-full rounded-full bg-[#3B82F6]" style={{ width: `${(c.count / catMax) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-3 p-5 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[#E6EBF2]">Needs attention</h2>
            <button
              type="button"
              onClick={() => onNavigateToTab('findings')}
              className="text-[11px] text-[#3B82F6] hover:text-[#60A5FA] font-medium flex items-center gap-1"
            >
              All findings ({findings.length}) <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          {unresolved.length === 0 ? (
            <p className="text-xs text-[#8A97AC]">Nothing open. Run an investigation to populate findings.</p>
          ) : (
            <div className="divide-y divide-[#232B38]/60 -mx-1">
              {unresolved.slice(0, 5).map((f) => (
                <div key={f.id} className="px-1 py-2 flex items-center gap-3 hover:bg-[#1B222E]/40 rounded transition-colors">
                  <StatusBadge type="severity" value={f.severity} />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-[#E6EBF2] truncate">{f.title}</div>
                    <div className="text-[10px] text-[#8A97AC] font-mono truncate">
                      {f.file_path}{f.line_number ? `:${f.line_number}` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (onSelectFindingForFix) onSelectFindingForFix(f);
                      else onNavigateToTab('investigations', 'fix_verify');
                    }}
                    className="text-[11px] text-[#3B82F6] hover:text-[#60A5FA] font-medium flex-shrink-0"
                  >
                    Review & Fix
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent activity — compact */}
      <div className="p-5 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#E6EBF2]">Recent activity &amp; enforcement</h2>
          <button
            type="button"
            onClick={() => onNavigateToTab('investigations', 'agentfence')}
            className="text-[11px] text-[#3B82F6] hover:text-[#60A5FA] font-medium flex items-center gap-1"
          >
            Audit trail <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        {auditEvents.length === 0 ? (
          <p className="text-xs text-[#8A97AC]">No activity logged yet.</p>
        ) : (
          <div className="divide-y divide-[#232B38]/60 -mx-1">
            {auditEvents.slice(0, 4).map((evt) => (
              <div key={evt.id} className="px-1 py-2 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <StatusBadge type="decision" value={evt.decision} />
                  <div className="min-w-0">
                    <div className="font-mono text-[#E6EBF2] text-[11px] truncate">{evt.action}</div>
                    <p className="text-[#8A97AC] text-[10px] truncate">{evt.reason}</p>
                  </div>
                </div>
                <span className="text-[10px] text-[#8A97AC] font-mono whitespace-nowrap flex-shrink-0 tabular-nums">
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

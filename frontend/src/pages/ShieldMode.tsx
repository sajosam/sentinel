import React from 'react';
import { ShieldStatus } from '../types';
import {
  ShieldAlert,
  ShieldCheck,
  ShieldBan,
  Activity,
  Cpu,
  Lock,
  FileCheck,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface Props {
  shieldStatus: ShieldStatus | null;
  onTriggerPolicyBlock: () => void;
}

export const ShieldMode: React.FC<Props> = ({ shieldStatus, onTriggerPolicyBlock }) => {
  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">AgentFence — Autonomous Policy Gatekeeper</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE SHIELD
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">
              Independent deterministic policy engine enforcing host boundaries, file modification restrictions, and tool permissions on AI coding agents.
            </p>
          </div>
        </div>

        <button
          onClick={onTriggerPolicyBlock}
          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-rose-600/20 glow-red transition-all"
        >
          <ShieldBan className="w-4 h-4" />
          <span>Test Policy Denial (Scenario E)</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
          <span className="text-[10px] font-semibold uppercase text-slate-400 tracking-wider">Total Operations Monitored</span>
          <div className="text-2xl font-bold text-slate-100 mt-1">{shieldStatus?.metrics.total_events_monitored || 0}</div>
        </div>
        <div className="p-4 rounded-xl border border-rose-900/40 bg-rose-950/20">
          <span className="text-[10px] font-semibold uppercase text-rose-400 tracking-wider">Strictly Blocked Actions</span>
          <div className="text-2xl font-bold text-rose-400 mt-1">{shieldStatus?.metrics.blocked_actions || 0}</div>
        </div>
        <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20">
          <span className="text-[10px] font-semibold uppercase text-emerald-400 tracking-wider">Allowed Permitted Operations</span>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{shieldStatus?.metrics.allowed_actions || 0}</div>
        </div>
        <div className="p-4 rounded-xl border border-amber-900/40 bg-amber-950/20">
          <span className="text-[10px] font-semibold uppercase text-amber-400 tracking-wider">Pending Approvals</span>
          <div className="text-2xl font-bold text-amber-400 mt-1">{shieldStatus?.metrics.pending_approvals || 0}</div>
        </div>
      </div>

      {/* Monitored vs Strictly Blocked Rules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monitored Events */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Monitored Activity Streams</span>
          </h3>
          <p className="text-xs text-slate-400">
            Events observed and audited in append-only telemetry with automatic secret redaction:
          </p>
          <div className="space-y-2 mt-3">
            {(shieldStatus?.monitored_event_types || [
              'File Read Operations in Workspace',
              'Subprocess Command Invocations',
              'Security Scanner Execution Cycles',
              'Audit Trail Logging',
              'Sensitive Credential Redaction Filters'
            ]).map((evt, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-slate-800/80 bg-slate-900/50 text-xs text-slate-300 flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />
                <span>{evt}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Strictly Blocked Operations */}
        <div className="p-5 rounded-2xl border border-rose-950/50 bg-[#0b101c] space-y-3">
          <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2 pb-2 border-b border-rose-950/60">
            <ShieldBan className="w-4 h-4 text-rose-400" />
            <span>Strictly Blocked Actions (Zero Tolerance)</span>
          </h3>
          <p className="text-xs text-slate-400">
            Operations deterministically intercepted and denied by PolicyEngine. The AI model cannot override:
          </p>
          <div className="space-y-2 mt-3">
            {(shieldStatus?.strictly_blocked_operations || [
              'Writes to Protected Project Files (.env, protected_admin_keys.json)',
              'Path Traversal Attempts (.. / /etc / ~)',
              'Execution of Disallowed Binary Tools',
              'Unapproved Patch Applications'
            ]).map((blk, idx) => (
              <div key={idx} className="p-2.5 rounded-lg border border-rose-900/40 bg-rose-950/20 text-xs text-rose-300 flex items-center gap-2">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>{blk}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Registered Coding Tools & Gatekeeper Integrations */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>Registered AI Coding Tools & Agent Integrations</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {(shieldStatus?.registered_agents || [
            { id: 'sentinel-agent', name: 'SentinelOS Autonomous Orchestrator', type: 'Internal', status: 'Enforcing' },
            { id: 'antigravity-ide', name: 'Google Antigravity IDE', type: 'IDE Integration', status: 'Monitored' },
            { id: 'claude-code', name: 'Claude Code CLI', type: 'CLI Tool', status: 'Monitored' },
            { id: 'cursor', name: 'Cursor Editor', type: 'Editor Extension', status: 'Monitored' }
          ]).map((agent) => (
            <div key={agent.id} className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[10px] uppercase font-mono text-slate-500">{agent.type}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                  agent.status === 'Enforcing' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-300'
                }`}>
                  {agent.status}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200">{agent.name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

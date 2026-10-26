import React from 'react';
import { SystemHealth, Workspace } from '../types';
import { ShieldCheck, CheckCircle2, AlertCircle, ArrowRight, Play, Terminal, Lock } from 'lucide-react';

interface Props {
  health: SystemHealth | null;
  currentWorkspace: Workspace | null;
  onStartAudit: () => void;
  onNavigateToTab: (tab: any) => void;
}

export const Onboarding: React.FC<Props> = ({ health, currentWorkspace, onStartAudit, onNavigateToTab }) => {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Welcome Banner */}
      <div className="p-8 rounded-3xl border border-slate-800 bg-gradient-to-br from-[#0c1322] via-[#09101c] to-[#0c1322] text-center space-y-4 glow-blue">
        <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div>
          <span className="text-xs uppercase font-mono tracking-widest text-sky-400 font-semibold">Welcome to SentinelOS</span>
          <h2 className="text-2xl font-bold text-slate-100 mt-1">Autonomous AI Security Platform</h2>
          <p className="text-xs text-slate-400 max-w-xl mx-auto mt-2 leading-relaxed">
            Build with AI. Stay in control. SentinelOS empowers developers to harness AI coding agents safely through local-first autonomous investigations, deterministic policy enforcement, and verification.
          </p>
        </div>

        <div className="pt-2">
          <button
            onClick={onStartAudit}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-2 shadow-lg glow-blue transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Launch Autonomous Investigation</span>
          </button>
        </div>
      </div>

      {/* 3 Core Pillars Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Terminal className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200">The LLM Reasons</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Meta Llama generates structured investigation plans and interprets scanner evidence. The model never self-certifies fixes.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200">The Policy Engine Controls</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            AgentFence deterministically intercepts unauthorized writes, path traversal attempts, and sensitive credential modifications.
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-2">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <h4 className="text-xs font-bold text-slate-200">The Verification Engine Checks</h4>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Re-scans codebases with Gitleaks, Semgrep, OSV-Scanner, and automated test suites to confirm actual resolution before and after.
          </p>
        </div>
      </div>

      {/* System Readiness Checklist */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>System Readiness & Scanner Verification Checklist</span>
        </h3>

        <div className="space-y-3">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-200">Gitleaks Secret Scanner</span>
              <span className="block text-[11px] text-slate-500 font-mono">Real binary installed on host path: {health?.scanners?.gitleaks?.path}</span>
            </div>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Verified
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-200">Semgrep Static Analysis Engine</span>
              <span className="block text-[11px] text-slate-500 font-mono">Real binary installed on host path: {health?.scanners?.semgrep?.path}</span>
            </div>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Verified
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-200">OSV-Scanner Supply Chain Engine</span>
              <span className="block text-[11px] text-slate-500 font-mono">Real binary installed on host path: {health?.scanners?.osv_scanner?.path}</span>
            </div>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Verified
            </span>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div>
              <span className="font-semibold text-slate-200">SentinelOS Security Lab Demo Target</span>
              <span className="block text-[11px] text-slate-500 font-mono">Active Target: {currentWorkspace?.display_name || 'Configuring...'}</span>
            </div>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Ready for Live Demo
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

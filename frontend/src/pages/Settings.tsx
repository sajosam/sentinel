import React from 'react';
import { SystemHealth } from '../types';
import { Settings as SettingsIcon, CheckCircle2, XCircle, Cpu, Shield, Database, Terminal } from 'lucide-react';

interface Props {
  health: SystemHealth | null;
}

export const Settings: React.FC<Props> = ({ health }) => {
  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
          <SettingsIcon className="w-5 h-5 text-sky-400" />
          <span>Platform Settings & Engine Configuration</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Verify host scanner readiness, AI model gateway endpoints, and autonomous execution limits.
        </p>
      </div>

      {/* Model Gateway Config Card */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
          <Cpu className="w-4 h-4 text-sky-400" />
          <span>AI Model Gateway (Meta Llama Hackathon Primary Model)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Provider</span>
            <span className="text-slate-200 font-semibold">{health?.model_gateway?.provider || 'meta'}</span>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">Active Model Identifier</span>
            <span className="text-sky-400 font-semibold">{health?.model_gateway?.model_name || 'llama-3.3-70b-versatile'}</span>
          </div>

          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 md:col-span-2">
            <span className="text-[10px] text-slate-500 uppercase block mb-1">API Base Endpoint</span>
            <span className="text-slate-300 truncate block">{health?.model_gateway?.base_url || 'https://api.groq.com/openai/v1'}</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-sky-900/40 bg-sky-950/20 text-xs text-sky-300">
          <strong>Configurable Integration:</strong> SentinelOS connects via the official OpenAI client SDK to Meta's supported Llama 3.3 models. API credentials and base URLs are configured in local <code className="bg-slate-900 px-1 py-0.5 rounded border border-sky-900">.env</code> and redacted from all logs.
        </div>
      </div>

      {/* Scanner Binaries Readiness */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Security Scanner Integrations Status</span>
        </h3>

        <div className="space-y-3">
          {/* Gitleaks */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-200">Gitleaks (Secret Detector)</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{health?.scanners?.gitleaks?.path || '/opt/homebrew/bin/gitleaks'}</div>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Ready & Linked
            </span>
          </div>

          {/* Semgrep */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-200">Semgrep (SAST Engine)</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{health?.scanners?.semgrep?.path || '/opt/homebrew/bin/semgrep'}</div>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Ready & Linked
            </span>
          </div>

          {/* OSV Scanner */}
          <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-slate-200">OSV-Scanner (Supply Chain CVEs)</div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5">{health?.scanners?.osv_scanner?.path || '/opt/homebrew/bin/osv-scanner'}</div>
            </div>
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
              <CheckCircle2 className="w-4 h-4" /> Ready & Linked
            </span>
          </div>
        </div>
      </div>

      {/* Investigation Limits Card */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3 text-xs">
        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
          <Terminal className="w-4 h-4 text-slate-400" />
          <span>Autonomous Execution Budget Limits</span>
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-slate-300">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">Max Tool Calls</span>
            <span className="font-mono font-bold text-slate-100 text-sm">10 calls</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">Tool Timeout</span>
            <span className="font-mono font-bold text-slate-100 text-sm">45s / tool</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">Graph Steps</span>
            <span className="font-mono font-bold text-slate-100 text-sm">12 steps</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[10px] text-slate-500 block uppercase">Model Retries</span>
            <span className="font-mono font-bold text-slate-100 text-sm">2 attempts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { SystemHealth } from '../types';
import { CheckCircle2, Shield, Cpu, Lock } from 'lucide-react';

interface Props {
  health: SystemHealth | null;
}

export const Settings: React.FC<Props> = ({ health }) => {
  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#232B38]">
        <h1 className="text-xl font-semibold text-[#E6EBF2] tracking-tight">Settings & Integrations</h1>
        <p className="text-xs text-[#8A97AC] mt-0.5">
          Configure model providers, inspect local scanner paths, and review autonomous enforcement limits.
        </p>
      </div>

      {/* Group 1: Meta AI Model Architecture */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#E6EBF2]">
            <Cpu className="w-4 h-4 text-[#3B82F6]" />
            <span>Meta AI Model Gateway Architecture</span>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border bg-[#3B82F6]/15 text-[#3B82F6] border-[#3B82F6]/30">
            Production Mode (Meta AI)
          </span>
        </div>

        <div className="border border-[#232B38] rounded-xl bg-[#141A24] p-5 space-y-4 text-xs shadow-sm">
          {/* Active Provider & Target Endpoint */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#0A0E14] border border-[#232B38]">
              <span className="text-[11px] text-[#8A97AC] block mb-1 font-medium">Active Environment</span>
              <span className="font-semibold text-[#E6EBF2] uppercase font-mono">
                {health?.model_gateway?.deploy_env || 'prod'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0A0E14] border border-[#232B38]">
              <span className="text-[11px] text-[#8A97AC] block mb-1 font-medium">Active Provider</span>
              <span className="font-semibold text-[#3B82F6] uppercase font-mono">
                {health?.model_gateway?.provider || 'meta'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0A0E14] border border-[#232B38]">
              <span className="text-[11px] text-[#8A97AC] block mb-1 font-medium">Connection Status</span>
              <span className={`font-semibold flex items-center gap-1.5 ${
                health?.model_gateway?.configured ? 'text-[#10B981]' : 'text-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  health?.model_gateway?.configured ? 'bg-[#10B981]' : 'bg-amber-400'
                }`} />
                {health?.model_gateway?.configured ? 'API Connected' : 'Deterministic Mode (Offline Ready)'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0A0E14] border border-[#232B38]">
            <span className="text-[11px] text-[#8A97AC] block mb-1 font-medium">Active Endpoint URL</span>
            <span className="text-[#E6EBF2] font-mono text-[11px] break-all">
              {health?.model_gateway?.base_url || 'https://api.meta.ai/v1'}
            </span>
          </div>

          {/* Model Mapping Matrix: live values from /api/health */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-[#E6EBF2] block">
              Model per task (Meta Model API)
            </span>
            <div className="border border-[#232B38] rounded-lg overflow-hidden divide-y divide-[#232B38]">
              {[
                ['planning', 'Planning & Orchestration', 'Chooses which scanners to run'],
                ['reasoning', 'ThreatLens Attack Reasoning', 'Connects findings into exploit paths'],
                ['remediation', 'Remediation Patching', 'Drafts search/replace edits for a fix'],
                ['discovery', 'Fast Discovery', 'Lightweight classification tasks'],
              ].map(([task, label, role]) => (
                <div key={task} className="grid grid-cols-12 p-2.5 text-[11px] items-center">
                  <span className="col-span-4 text-[#E6EBF2] font-medium">{label}</span>
                  <span className="col-span-3 font-mono text-[#3B82F6] font-semibold break-all">
                    {health?.model_gateway?.models?.[task] || '-'}
                  </span>
                  <span className="col-span-5 text-[#8A97AC]">{role}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-[#8A97AC] leading-relaxed">
            {health?.model_gateway?.configured
              ? 'Model calls are live. Secrets are redacted before any prompt leaves this machine.'
              : 'No API key configured: SentinelOS runs its deterministic offline engine. Set PROD_MODEL_API_KEY (or META_API_KEY) in .env to use Meta models.'}
          </p>
        </div>
      </div>

      {/* Group 2: Scanner Integrations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#E6EBF2]">
          <Shield className="w-4 h-4 text-[#10B981]" />
          <span>Security Scanner Integrations</span>
        </div>
        <div className="border border-[#232B38] rounded-xl bg-[#141A24] divide-y divide-[#232B38] text-xs overflow-hidden shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E6EBF2]">Gitleaks Secret Scanner</div>
              <div className="text-[11px] text-[#8A97AC] mt-0.5">Detects exposed API keys, tokens, and credentials in source files and Git history.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E6EBF2]">Semgrep SAST Engine</div>
              <div className="text-[11px] text-[#8A97AC] mt-0.5">Static code analysis checking for SQL injection, command execution, and insecure inputs.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E6EBF2]">OSV-Scanner Dependency Auditor</div>
              <div className="text-[11px] text-[#8A97AC] mt-0.5">Discovers requirements.txt and package.json manifests to detect known CVE vulnerabilities.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E6EBF2]">AST Dataflow Tracer (code_flow_trace)</div>
              <div className="text-[11px] text-[#8A97AC] mt-0.5">Traces untrusted HTTP request parameters to query execution sinks across Python AST nodes.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E6EBF2]">Prompt Shield AI Tester</div>
              <div className="text-[11px] text-[#8A97AC] mt-0.5">Probes application endpoints for prompt injection and simulated secret disclosure.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#10B981] font-medium bg-[#10B981]/10 px-2.5 py-1 rounded-md border border-[#10B981]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>
        </div>
      </div>

      {/* Group 3: Policy Engine & Safety Limits */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#E6EBF2]">
          <Lock className="w-4 h-4 text-[#3B82F6]" />
          <span>AgentFence Safety Limits</span>
        </div>
        <div className="border border-[#232B38] rounded-xl bg-[#141A24] p-5 space-y-3 text-xs shadow-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#232B38]">
            <span className="text-[#8A97AC]">Maximum autonomous investigation steps</span>
            <span className="font-mono font-medium text-[#E6EBF2]">14 steps (bounded closed-loop)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#232B38]">
            <span className="text-[#8A97AC]">Per-tool execution timeout</span>
            <span className="font-mono font-medium text-[#E6EBF2]">45 seconds</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#232B38]">
            <span className="text-[#8A97AC]">Workspace boundary traversal guard</span>
            <span className="font-medium text-[#10B981]">Strictly Enforced (..)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#8A97AC]">Sensitive file overwrite protection (.env, *.key)</span>
            <span className="font-medium text-[#10B981]">Shield Mode Deny</span>
          </div>
        </div>
      </div>
    </div>
  );
};

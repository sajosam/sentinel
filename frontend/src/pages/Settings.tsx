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
      <div className="pb-4 border-b border-[#283149]">
        <h1 className="text-xl font-semibold text-[#E8ECF5] tracking-tight">Settings & Integrations</h1>
        <p className="text-xs text-[#9AA6BF] mt-0.5">
          Configure model providers, inspect local scanner paths, and review autonomous enforcement limits.
        </p>
      </div>

      {/* Group 1: AI Model Configuration (Demo vs Prod) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#E8ECF5]">
            <Cpu className="w-4 h-4 text-[#8B7CFF]" />
            <span>AI Model Gateway Environments</span>
          </div>
          <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider border ${
            health?.model_gateway?.is_prod
              ? 'bg-[#8B7CFF]/15 text-[#8B7CFF] border-[#8B7CFF]/30'
              : 'bg-[#36D6B0]/15 text-[#36D6B0] border-[#36D6B0]/30'
          }`}>
            {health?.model_gateway?.is_prod ? 'Production Mode (Meta)' : 'Demo Mode (Groq)'}
          </span>
        </div>

        <div className="border border-[#283149] rounded-xl bg-[#141B2D] p-5 space-y-4 text-xs shadow-sm">
          {/* Active Provider & Target Endpoint */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-[#0B1020] border border-[#283149]">
              <span className="text-[11px] text-[#9AA6BF] block mb-1 font-medium">Active Environment</span>
              <span className="font-semibold text-[#E8ECF5] uppercase font-mono">
                {health?.model_gateway?.deploy_env || 'demo'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0B1020] border border-[#283149]">
              <span className="text-[11px] text-[#9AA6BF] block mb-1 font-medium">Active Provider</span>
              <span className="font-semibold text-[#8B7CFF] uppercase font-mono">
                {health?.model_gateway?.provider || 'groq'}
              </span>
            </div>
            <div className="p-3.5 rounded-lg bg-[#0B1020] border border-[#283149]">
              <span className="text-[11px] text-[#9AA6BF] block mb-1 font-medium">Connection Status</span>
              <span className={`font-semibold flex items-center gap-1.5 ${
                health?.model_gateway?.configured ? 'text-[#36D6B0]' : 'text-amber-300'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  health?.model_gateway?.configured ? 'bg-[#36D6B0]' : 'bg-amber-400'
                }`} />
                {health?.model_gateway?.configured ? 'API Connected' : 'Deterministic Mode (Offline Ready)'}
              </span>
            </div>
          </div>

          <div className="p-3.5 rounded-lg bg-[#0B1020] border border-[#283149]">
            <span className="text-[11px] text-[#9AA6BF] block mb-1 font-medium">Active Endpoint URL</span>
            <span className="text-[#E8ECF5] font-mono text-[11px] break-all">
              {health?.model_gateway?.base_url || 'https://api.groq.com/openai/v1'}
            </span>
          </div>

          {/* Model Mapping Matrix: Demo (Groq) vs Production (Meta) */}
          <div className="space-y-2 pt-1">
            <span className="text-[11px] font-semibold text-[#E8ECF5] block">
              Multi-Model Task Allocation (Demo vs Production)
            </span>
            <div className="border border-[#283149] rounded-lg overflow-hidden divide-y divide-[#283149]">
              <div className="grid grid-cols-3 p-2.5 bg-[#0B1020] text-[11px] font-semibold text-[#9AA6BF]">
                <span>Task / Responsibility</span>
                <span>Demo Provider (Groq)</span>
                <span>Production Provider (Meta)</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 hover:bg-[#1B243B]/30 transition-colors text-[11px]">
                <span className="text-[#E8ECF5] font-medium">Planning & Orchestration</span>
                <span className="font-mono text-[#9AA6BF]">llama-3.3-70b-versatile</span>
                <span className="font-mono text-[#8B7CFF] font-semibold">Meta Muse Spark Series</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 hover:bg-[#1B243B]/30 transition-colors text-[11px]">
                <span className="text-[#E8ECF5] font-medium">ThreatLens Attack Reasoning</span>
                <span className="font-mono text-[#9AA6BF]">llama-3.3-70b-versatile</span>
                <span className="font-mono text-[#8B7CFF] font-semibold">Meta Muse Wonder</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 hover:bg-[#1B243B]/30 transition-colors text-[11px]">
                <span className="text-[#E8ECF5] font-medium">Autonomous Remediation Patching</span>
                <span className="font-mono text-[#9AA6BF]">llama-3.3-70b-versatile</span>
                <span className="font-mono text-[#8B7CFF] font-semibold">Meta Muse Code</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 hover:bg-[#1B243B]/30 transition-colors text-[11px]">
                <span className="text-[#E8ECF5] font-medium">Local Language Discovery</span>
                <span className="font-mono text-[#9AA6BF]">llama-3.1-8b-instant</span>
                <span className="font-mono text-[#8B7CFF] font-semibold">Meta Muse Spark Open</span>
              </div>
              <div className="grid grid-cols-3 p-2.5 hover:bg-[#1B243B]/30 transition-colors text-[11px]">
                <span className="text-[#E8ECF5] font-medium">Visual Surface & Redaction</span>
                <span className="font-mono text-[#9AA6BF]">llama-3.2-11b-vision</span>
                <span className="font-mono text-[#8B7CFF] font-semibold">Meta SAM 3.1 & Muse Image</span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#9AA6BF] leading-relaxed">
            Switch between environments by setting <code className="bg-[#0B1020] border border-[#283149] px-1.5 py-0.5 rounded font-mono text-[#8B7CFF]">DEPLOY_ENV=demo</code> (Groq Llama inference) or <code className="bg-[#0B1020] border border-[#283149] px-1.5 py-0.5 rounded font-mono text-[#8B7CFF]">DEPLOY_ENV=prod</code> (Meta Model API) in your <code className="bg-[#0B1020] border border-[#283149] px-1.5 py-0.5 rounded font-mono text-[#8B7CFF]">.env</code> file.
          </p>
        </div>
      </div>

      {/* Group 2: Scanner Integrations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#E8ECF5]">
          <Shield className="w-4 h-4 text-[#36D6B0]" />
          <span>Security Scanner Integrations</span>
        </div>
        <div className="border border-[#283149] rounded-xl bg-[#141B2D] divide-y divide-[#283149] text-xs overflow-hidden shadow-sm">
          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E8ECF5]">Gitleaks Secret Scanner</div>
              <div className="text-[11px] text-[#9AA6BF] mt-0.5">Detects exposed API keys, tokens, and credentials in source files and Git history.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#36D6B0] font-medium bg-[#36D6B0]/10 px-2.5 py-1 rounded-md border border-[#36D6B0]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E8ECF5]">Semgrep SAST Engine</div>
              <div className="text-[11px] text-[#9AA6BF] mt-0.5">Static code analysis checking for SQL injection, command execution, and insecure inputs.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#36D6B0] font-medium bg-[#36D6B0]/10 px-2.5 py-1 rounded-md border border-[#36D6B0]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E8ECF5]">OSV-Scanner Dependency Auditor</div>
              <div className="text-[11px] text-[#9AA6BF] mt-0.5">Discovers requirements.txt and package.json manifests to detect known CVE vulnerabilities.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#36D6B0] font-medium bg-[#36D6B0]/10 px-2.5 py-1 rounded-md border border-[#36D6B0]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E8ECF5]">AST Dataflow Tracer (code_flow_trace)</div>
              <div className="text-[11px] text-[#9AA6BF] mt-0.5">Traces untrusted HTTP request parameters to query execution sinks across Python AST nodes.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#36D6B0] font-medium bg-[#36D6B0]/10 px-2.5 py-1 rounded-md border border-[#36D6B0]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-4 flex items-center justify-between">
            <div>
              <div className="font-medium text-[#E8ECF5]">Prompt Shield AI Tester</div>
              <div className="text-[11px] text-[#9AA6BF] mt-0.5">Probes application endpoints for prompt injection and simulated secret disclosure.</div>
            </div>
            <span className="inline-flex items-center gap-1.5 text-[#36D6B0] font-medium bg-[#36D6B0]/10 px-2.5 py-1 rounded-md border border-[#36D6B0]/20">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>
        </div>
      </div>

      {/* Group 3: Policy Engine & Safety Limits */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#E8ECF5]">
          <Lock className="w-4 h-4 text-[#8B7CFF]" />
          <span>AgentFence Safety Limits</span>
        </div>
        <div className="border border-[#283149] rounded-xl bg-[#141B2D] p-5 space-y-3 text-xs shadow-sm">
          <div className="flex items-center justify-between py-2 border-b border-[#283149]">
            <span className="text-[#9AA6BF]">Maximum autonomous investigation steps</span>
            <span className="font-mono font-medium text-[#E8ECF5]">14 steps (bounded closed-loop)</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#283149]">
            <span className="text-[#9AA6BF]">Per-tool execution timeout</span>
            <span className="font-mono font-medium text-[#E8ECF5]">45 seconds</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-[#283149]">
            <span className="text-[#9AA6BF]">Workspace boundary traversal guard</span>
            <span className="font-medium text-[#36D6B0]">Strictly Enforced (..)</span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-[#9AA6BF]">Sensitive file overwrite protection (.env, *.key)</span>
            <span className="font-medium text-[#36D6B0]">Shield Mode Deny</span>
          </div>
        </div>
      </div>
    </div>
  );
};

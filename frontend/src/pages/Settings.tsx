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
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Configure model providers, inspect local scanner paths, and review enforcement limits.
        </p>
      </div>

      {/* Group 1: AI Model Configuration */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Cpu className="w-4 h-4 text-slate-500" />
          <span>AI Model Gateway</span>
        </div>
        <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">Provider</span>
              <span className="font-semibold text-slate-900 capitalize">{health?.model_gateway?.provider || 'meta'}</span>
            </div>
            <div className="p-3 rounded bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">Model Identifier</span>
              <span className="font-semibold text-slate-900 font-mono text-[11px]">{health?.model_gateway?.model_name || 'llama-3.3-70b-versatile'}</span>
            </div>
          </div>
          <div className="p-3 rounded bg-slate-50 border border-slate-200">
            <span className="text-[11px] text-slate-500 block mb-0.5 font-medium">Endpoint URL</span>
            <span className="text-slate-700 font-mono text-[11px] break-all">{health?.model_gateway?.base_url || 'https://api.groq.com/openai/v1'}</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Model parameters and API credentials are kept in your local <code className="bg-slate-100 px-1 py-0.5 rounded font-mono">.env</code> configuration and are automatically redacted before logs are written or context is transmitted.
          </p>
        </div>
      </div>

      {/* Group 2: Scanner Integrations */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Shield className="w-4 h-4 text-slate-500" />
          <span>Security Scanner Integrations</span>
        </div>
        <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 text-xs">
          <div className="p-3.5 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Gitleaks Secret Scanner</div>
              <div className="text-[11px] text-slate-500">Detects exposed API keys, tokens, and credentials in source files and Git history.</div>
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Semgrep SAST Engine</div>
              <div className="text-[11px] text-slate-500">Static code analysis checking for SQL injection, command execution, and insecure inputs.</div>
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">OSV-Scanner Dependency Auditor</div>
              <div className="text-[11px] text-slate-500">Discovers requirements.txt and package.json manifests to detect known CVE vulnerabilities.</div>
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>

          <div className="p-3.5 flex items-center justify-between">
            <div>
              <div className="font-medium text-slate-900">Prompt Shield AI Tester</div>
              <div className="text-[11px] text-slate-500">Probes application endpoints for prompt injection and simulated secret disclosure.</div>
            </div>
            <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Ready
            </span>
          </div>
        </div>
      </div>

      {/* Group 3: Policy Engine & Safety Limits */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Lock className="w-4 h-4 text-slate-500" />
          <span>AgentFence Safety Limits</span>
        </div>
        <div className="border border-slate-200 rounded-lg bg-white p-4 space-y-2 text-xs">
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600">Maximum autonomous investigation steps</span>
            <span className="font-mono font-medium text-slate-900">12 steps</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600">Per-tool execution timeout</span>
            <span className="font-mono font-medium text-slate-900">45 seconds</span>
          </div>
          <div className="flex items-center justify-between py-1 border-b border-slate-100">
            <span className="text-slate-600">Workspace boundary traversal guard</span>
            <span className="font-medium text-emerald-700">Strictly Enforced (..)</span>
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-slate-600">Sensitive file overwrite protection (.env, *.key)</span>
            <span className="font-medium text-emerald-700">Shield Mode Deny</span>
          </div>
        </div>
      </div>
    </div>
  );
};

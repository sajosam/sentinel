import React, { useState } from 'react';
import { Investigation, InvestigationStep } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import {
  Terminal,
  Play,
  XCircle,
  Search,
  Key,
  Package,
  Code2,
  ShieldAlert,
  Network,
  Wrench,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock
} from 'lucide-react';

interface Props {
  currentInvestigation: Investigation | null;
  onRefresh: () => void;
  onStartNew: () => void;
}

export const InvestigationCenter: React.FC<Props> = ({
  currentInvestigation,
  onRefresh,
  onStartNew
}) => {
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);

  const handleCancel = async () => {
    if (!currentInvestigation) return;
    try {
      await api.cancelInvestigation(currentInvestigation.id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const getStepIcon = (stepType: string) => {
    switch (stepType) {
      case 'discovery':
        return Search;
      case 'secret_scan':
        return Key;
      case 'dependency_scan':
        return Package;
      case 'sast_scan':
        return Code2;
      case 'prompt_shield_test':
        return ShieldAlert;
      case 'attack_path_analysis':
        return Network;
      case 'remediation_proposal':
        return Wrench;
      case 'verification':
        return ShieldCheck;
      default:
        return Terminal;
    }
  };

  const getStepDetails = (step: InvestigationStep, nextStep?: InvestigationStep) => {
    switch (step.step_type) {
      case 'discovery':
        return {
          checking: 'Analyzing project directory structure, manifests, and sensitive file patterns.',
          discovered: step.tool_output?.files_indexed
            ? `Indexed ${step.tool_output.files_indexed} project files and identified protected paths.`
            : 'Mapped project boundary and protected paths (.env, keys).',
          next: 'Proceeding to scan project files and Git history for exposed secrets.'
        };
      case 'secret_scan':
        return {
          checking: 'Executing Gitleaks scanner to detect API keys, tokens, and hardcoded credentials.',
          discovered: step.tool_output?.findings?.length
            ? `Detected ${step.tool_output.findings.length} exposed credential(s) with confirmed file line references.`
            : 'Checked files with Gitleaks; findings recorded with automatic secret redaction.',
          next: 'Scanning third-party package manifests against the OSV vulnerability database.'
        };
      case 'dependency_scan':
        return {
          checking: 'Discovering package manifests (requirements.txt, package.json) and querying OSV database for CVEs.',
          discovered: step.tool_output?.findings?.length
            ? `Identified ${step.tool_output.findings.length} vulnerable package dependency matching known CVEs.`
            : 'Scanned project dependencies against national vulnerability records.',
          next: 'Running Semgrep SAST analyzer to check application code for SQL injection and unsafe input handling.'
        };
      case 'sast_scan':
        return {
          checking: 'Analyzing application source code with Semgrep for injection vulnerabilities and dangerous patterns.',
          discovered: step.tool_output?.findings?.length
            ? `Found ${step.tool_output.findings.length} static code vulnerability (including unparameterized SQL queries).`
            : 'Completed static code analysis across source files.',
          next: 'Executing Prompt Shield test to probe AI endpoints for prompt injection and simulated secret disclosure.'
        };
      case 'prompt_shield_test':
        return {
          checking: 'Probing AI application endpoints with prompt injection and instruction extraction test payloads.',
          discovered: step.tool_output?.findings?.length
            ? `Recorded ${step.tool_output.findings.length} prompt guardrail failure on unhardened AI test routes.`
            : 'Executed controlled prompt injection probes against local demo target.',
          next: 'Correlating related findings into ThreatLens attack paths.'
        };
      default:
        return {
          checking: `Executing ${step.tool_name || step.step_type} under AgentFence boundary policies.`,
          discovered: step.reasoning || 'Step execution completed successfully.',
          next: nextStep ? `Next: ${nextStep.step_type.replace(/_/g, ' ')}` : 'Generating final audit summary.'
        };
    }
  };

  if (!currentInvestigation) {
    return (
      <div className="max-w-xl mx-auto my-16 text-center space-y-4">
        <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 mx-auto">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-slate-900">No active investigation</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Launch an autonomous investigation to inspect your workspace for secrets, dependencies, and code vulnerabilities.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="px-4 py-2 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Investigation</span>
        </button>
      </div>
    );
  }

  const isRunning = ['running', 'planning', 'pending'].includes(currentInvestigation.status);
  const steps = currentInvestigation.steps || [];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Investigation</h1>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              currentInvestigation.status === 'completed'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : isRunning
                ? 'bg-sky-50 text-sky-700 border-sky-200'
                : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {currentInvestigation.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Goal: {currentInvestigation.goal} • Started {new Date(currentInvestigation.created_at).toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-md border border-rose-200 bg-white hover:bg-rose-50 text-rose-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Scan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartNew}
              className="px-3.5 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run New Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Final Verdict Summary (if completed) */}
      {currentInvestigation.summary && (
        <div className="p-3.5 rounded-lg border border-emerald-200 bg-emerald-50/60 text-xs text-emerald-900 space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-emerald-800">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Investigation Completed</span>
          </div>
          <p className="text-slate-700 leading-relaxed">{currentInvestigation.summary}</p>
        </div>
      )}

      {/* 3. Readable Investigation Timeline */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-slate-900">
          Investigation Timeline ({steps.length} steps)
        </div>

        <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
          {steps.map((step, idx) => {
            const isExpanded = expandedStepId === step.id;
            const StepIcon = getStepIcon(step.step_type);
            const details = getStepDetails(step, steps[idx + 1]);

            return (
              <div key={step.id} className="p-4 space-y-2.5">
                {/* Step Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 flex-shrink-0">
                      <StepIcon className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                        <span>Step {step.step_index}: {step.step_type.replace(/_/g, ' ')}</span>
                        {step.tool_name && (
                          <span className="font-mono text-[11px] text-slate-400 font-normal">({step.tool_name})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {step.completed_at ? new Date(step.completed_at).toLocaleTimeString() : 'Running'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase ${
                    step.status === 'completed'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : step.status === 'running'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}>
                    {step.status}
                  </span>
                </div>

                {/* Plain-English 3-part Explanation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Checking</span>
                    <p className="text-slate-700 text-[11px] leading-snug">{details.checking}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Discovered</span>
                    <p className="text-slate-700 text-[11px] leading-snug">{details.discovered}</p>
                  </div>
                  <div className="p-2.5 rounded bg-slate-50 border border-slate-200/80 space-y-0.5">
                    <span className="text-[10px] uppercase font-semibold text-slate-400 block tracking-wider">Next Step</span>
                    <p className="text-slate-700 text-[11px] leading-snug">{details.next}</p>
                  </div>
                </div>

                {/* Expandable Evidence & Technical Details (Hidden by default) */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{isExpanded ? 'Hide evidence and technical details' : 'View evidence and technical details'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2 p-3 rounded bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto">
                      {step.reasoning && (
                        <div className="mb-2 pb-2 border-b border-slate-800 text-slate-300">
                          <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Model Reasoning:</span>
                          {step.reasoning}
                        </div>
                      )}
                      <span className="text-[10px] uppercase text-slate-500 block mb-0.5">Raw Output Artifacts:</span>
                      <pre className="whitespace-pre-wrap leading-relaxed">
                        {JSON.stringify(step.tool_output || {}, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

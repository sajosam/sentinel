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
        <div className="w-12 h-12 rounded-xl bg-[#141B2D] border border-[#283149] flex items-center justify-center text-[#8B7CFF] mx-auto shadow-sm">
          <Terminal className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-[#E8ECF5]">No active investigation</h2>
          <p className="text-xs text-[#9AA6BF] mt-1 max-w-sm mx-auto leading-relaxed">
            Launch an autonomous investigation to inspect your workspace for secrets, dependencies, and code vulnerabilities.
          </p>
        </div>
        <button
          type="button"
          onClick={onStartNew}
          className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#283149]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-[#E8ECF5] tracking-tight">Autonomous Investigation</h1>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium border ${
              currentInvestigation.status === 'completed'
                ? 'bg-[#36D6B0]/10 text-[#36D6B0] border-[#36D6B0]/20'
                : isRunning
                ? 'bg-[#8B7CFF]/10 text-[#8B7CFF] border-[#8B7CFF]/25 animate-pulse'
                : 'bg-[#1B243B] text-[#9AA6BF] border-[#283149]'
            }`}>
              {currentInvestigation.status.toUpperCase()}
            </span>
          </div>
          <p className="text-xs text-[#9AA6BF] mt-1">
            Goal: {currentInvestigation.goal} • Started {new Date(currentInvestigation.created_at).toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isRunning ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-3.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Scan</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onStartNew}
              className="px-3.5 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run New Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Final Verdict Summary (if completed) */}
      {currentInvestigation.summary && (
        <div className="p-4 rounded-xl border border-[#36D6B0]/25 bg-[#36D6B0]/10 text-xs text-[#E8ECF5] space-y-1">
          <div className="font-semibold flex items-center gap-1.5 text-[#36D6B0]">
            <CheckCircle2 className="w-4 h-4 text-[#36D6B0]" />
            <span>Investigation Completed</span>
          </div>
          <p className="text-[#9AA6BF] leading-relaxed">{currentInvestigation.summary}</p>
        </div>
      )}

      {/* 3. Readable Investigation Timeline */}
      <div className="space-y-3">
        <div className="text-xs font-semibold text-[#E8ECF5] flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-[#8B7CFF]" />
          <span>Investigation Timeline ({steps.length} steps)</span>
        </div>

        <div className="border border-[#283149] rounded-xl bg-[#141B2D] divide-y divide-[#283149] overflow-hidden">
          {steps.map((step, idx) => {
            const isExpanded = expandedStepId === step.id;
            const StepIcon = getStepIcon(step.step_type);
            const details = getStepDetails(step, steps[idx + 1]);

            return (
              <div key={step.id} className="p-4 space-y-3">
                {/* Step Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#1B243B] border border-[#283149] flex items-center justify-center text-[#8B7CFF] flex-shrink-0">
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#E8ECF5] flex items-center gap-2">
                        <span>Step {step.step_index}: {step.step_type.replace(/_/g, ' ')}</span>
                        {step.tool_name && (
                          <span className="font-mono text-[11px] text-[#9AA6BF] font-normal">({step.tool_name})</span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#9AA6BF] font-mono">
                        {step.completed_at ? new Date(step.completed_at).toLocaleTimeString() : 'Running'}
                      </div>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase ${
                    step.status === 'completed'
                      ? 'bg-[#36D6B0]/10 text-[#36D6B0] border-[#36D6B0]/20'
                      : step.status === 'running'
                      ? 'bg-[#8B7CFF]/10 text-[#8B7CFF] border-[#8B7CFF]/20 animate-pulse'
                      : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                  }`}>
                    {step.status}
                  </span>
                </div>

                {/* Plain-English 3-part Explanation */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                  <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149] space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#8B7CFF] block tracking-wider">Checking</span>
                    <p className="text-[#9AA6BF] text-[11px] leading-relaxed">{details.checking}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149] space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#36D6B0] block tracking-wider">Discovered</span>
                    <p className="text-[#E8ECF5] text-[11px] leading-relaxed">{details.discovered}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149] space-y-1">
                    <span className="text-[10px] uppercase font-semibold text-[#9AA6BF] block tracking-wider">Next Step</span>
                    <p className="text-[#9AA6BF] text-[11px] leading-relaxed">{details.next}</p>
                  </div>
                </div>

                {/* Expandable Evidence & Technical Details */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                    className="text-[11px] text-[#9AA6BF] hover:text-[#E8ECF5] font-medium flex items-center gap-1 transition-colors"
                  >
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span>{isExpanded ? 'Hide evidence and technical details' : 'View evidence and technical details'}</span>
                  </button>

                  {isExpanded && (
                    <div className="mt-2.5 p-3 rounded-lg bg-[#0B1020] border border-[#283149] text-[#E8ECF5] font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto">
                      {step.reasoning && (
                        <div className="mb-2 pb-2 border-b border-[#283149] text-[#9AA6BF]">
                          <span className="text-[10px] uppercase text-[#8B7CFF] block mb-0.5">Model Reasoning:</span>
                          {step.reasoning}
                        </div>
                      )}
                      <span className="text-[10px] uppercase text-[#8B7CFF] block mb-0.5">Raw Output Artifacts:</span>
                      <pre className="whitespace-pre-wrap leading-relaxed text-[#9AA6BF]">
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

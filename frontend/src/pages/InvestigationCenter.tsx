import React, { useEffect, useState } from 'react';
import { Investigation, InvestigationStep } from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import {
  Terminal,
  CheckCircle2,
  Clock,
  AlertCircle,
  Play,
  XCircle,
  Sparkles,
  Layers,
  FileCode,
  ShieldAlert,
  Search,
  Key,
  Package,
  Code2,
  Network,
  Wrench,
  ShieldCheck,
  ArrowRight
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
  const [selectedStep, setSelectedStep] = useState<InvestigationStep | null>(null);

  useEffect(() => {
    if (currentInvestigation?.steps?.length) {
      setSelectedStep(currentInvestigation.steps[currentInvestigation.steps.length - 1]);
    }
  }, [currentInvestigation]);

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

  const getStepFriendlyName = (stepType: string, toolName?: string) => {
    switch (stepType) {
      case 'discovery':
        return 'Understanding the Project';
      case 'secret_scan':
        return 'Checking for Exposed Secrets';
      case 'dependency_scan':
        return 'Scanning Dependencies for CVEs';
      case 'sast_scan':
        return 'Investigating Suspicious Code (SAST)';
      case 'prompt_shield_test':
        return 'Probing AI Prompts & Guardrails';
      case 'attack_path_analysis':
        return 'Connecting Related Risks (ThreatLens)';
      case 'remediation_proposal':
        return 'Proposing Security Patches';
      case 'verification':
        return 'Verifying Fixes & Tests';
      default:
        return toolName || stepType.replace(/_/g, ' ');
    }
  };

  if (!currentInvestigation) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-[#0b101c] space-y-4 max-w-xl mx-auto my-12">
        <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto">
          <Terminal className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-100">No Active Investigation</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Start an autonomous security audit to inspect your workspace. SentinelOS coordinates real host scanners (Gitleaks, Semgrep, OSV) under independent policy rules.
        </p>
        <button
          onClick={onStartNew}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold inline-flex items-center gap-2 glow-blue transition-all"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Launch Autonomous Scan</span>
        </button>
      </div>
    );
  }

  const isRunning = ['running', 'planning', 'pending'].includes(currentInvestigation.status);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header Card */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-sky-400 animate-pulse' : currentInvestigation.status === 'completed' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
              Autonomous Investigation
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
              Status: {currentInvestigation.status.toUpperCase()}
            </span>
          </div>
          <h1 className="text-lg font-bold text-slate-100">{currentInvestigation.goal}</h1>
          <p className="text-xs text-slate-400 font-mono">
            ID: {currentInvestigation.id} • Started: {new Date(currentInvestigation.created_at).toLocaleTimeString()}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isRunning ? (
            <button
              onClick={handleCancel}
              className="px-4 py-2 rounded-xl border border-rose-900 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <XCircle className="w-4 h-4 text-rose-400" />
              <span>Cancel Scan</span>
            </button>
          ) : (
            <button
              onClick={onStartNew}
              className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-2 glow-blue transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run New Scan</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Workflow View: Steps Timeline (Left) + Step Output Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Steps List (Timeline) */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-300">
              Executed Timeline
            </span>
            <span className="text-[10px] font-mono text-slate-500">{currentInvestigation.steps?.length || 0} step(s) executed</span>
          </div>

          <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1">
            {(currentInvestigation.steps || []).map((step) => {
              const isSelected = selectedStep?.id === step.id;
              const isStepRunning = step.status === 'running';
              const StepIcon = getStepIcon(step.step_type);
              const friendlyName = getStepFriendlyName(step.step_type, step.tool_name);

              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStep(step)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                    isSelected
                      ? 'border-sky-500 bg-sky-950/30 shadow-sm'
                      : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-md flex items-center justify-center text-xs ${
                        isSelected ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'
                      }`}>
                        <StepIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-mono text-slate-400 text-[11px]">Step {step.step_index}</span>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                      step.status === 'completed'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                        : isStepRunning
                        ? 'bg-sky-950 text-sky-400 border border-sky-800 animate-pulse'
                        : 'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {step.status}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200">
                    {friendlyName}
                  </div>

                  {step.reasoning && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-snug">
                      {step.reasoning}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Details & Live Log Inspector */}
        <div className="lg:col-span-2 p-5 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {selectedStep ? `Step ${selectedStep.step_index}: ${getStepFriendlyName(selectedStep.step_type, selectedStep.tool_name)}` : 'Investigation Output & Evidence'}
                </h3>
              </div>
              {selectedStep && (
                <span className="text-[10px] font-mono text-slate-400">
                  Tool: {selectedStep.tool_name || 'Orchestrator'}
                </span>
              )}
            </div>

            {selectedStep ? (
              <div className="mt-4 space-y-4">
                {/* Reasoning Box */}
                {selectedStep.reasoning && (
                  <div className="p-3.5 rounded-xl border border-sky-900/40 bg-sky-950/20 space-y-1">
                    <span className="text-[10px] font-semibold tracking-wider text-sky-400 uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Why this step was selected
                    </span>
                    <p className="text-xs text-slate-200 leading-relaxed font-sans">{selectedStep.reasoning}</p>
                  </div>
                )}

                {/* Structured Output or Raw Logs */}
                <div>
                  <span className="text-[10px] font-semibold tracking-wider text-slate-400 uppercase block mb-1.5">
                    Collected Evidence & Tool Results
                  </span>
                  <div className="rounded-xl border border-slate-800 bg-[#070b12] p-3 font-mono text-xs text-slate-300 max-h-[300px] overflow-y-auto">
                    {selectedStep.tool_output && Object.keys(selectedStep.tool_output).length > 0 ? (
                      <pre className="text-[11px] leading-relaxed whitespace-pre-wrap font-mono">
                        {JSON.stringify(selectedStep.tool_output, null, 2)}
                      </pre>
                    ) : (
                      <span className="text-slate-500 italic">No output artifacts recorded for this step.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-slate-500">
                Select a step on the left to inspect its telemetry, tool outputs, and LLM reasoning.
              </div>
            )}
          </div>

          {/* Investigation Final Summary */}
          {currentInvestigation.summary && (
            <div className="p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/20 text-xs text-emerald-300">
              <span className="font-bold block mb-1 text-[11px] text-emerald-400 uppercase tracking-wider">Final Audit Verdict</span>
              <p className="leading-relaxed">{currentInvestigation.summary}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

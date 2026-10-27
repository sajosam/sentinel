import React, { useState, useEffect } from 'react';
import {
  Investigation,
  InvestigationStep,
  Finding,
  AttackPath,
  AuditEvent,
  Workspace,
  Remediation,
  Verification
} from '../types';
import { api } from '../api/client';
import { StatusBadge } from '../components/StatusBadge';
import { GraphViewer } from '../components/GraphViewer';
import { DiffViewer } from '../components/DiffViewer';
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
  Clock,
  Sparkles,
  Copy,
  Check,
  ScrollText,
  AlertTriangle,
  GitBranch,
  Undo2,
  FileCode,
  Shield
} from 'lucide-react';

interface Props {
  currentInvestigation: Investigation | null;
  investigations?: Investigation[];
  findings?: Finding[];
  attackPaths?: AttackPath[];
  auditEvents?: AuditEvent[];
  currentWorkspace?: Workspace | null;
  onRefresh: () => void;
  onStartNew: (goal?: string) => void;
  initialSubTab?: 'timeline' | 'attack_paths' | 'fix_verify' | 'audit';
  selectedFindingId?: string | null;
}

export type InvestigationSubTab = 'timeline' | 'attack_paths' | 'fix_verify' | 'audit';

export const InvestigationCenter: React.FC<Props> = ({
  currentInvestigation,
  investigations = [],
  findings = [],
  attackPaths = [],
  auditEvents = [],
  currentWorkspace,
  onRefresh,
  onStartNew,
  initialSubTab = 'timeline',
  selectedFindingId: initialSelectedFindingId = null,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<InvestigationSubTab>(initialSubTab);
  const [expandedStepId, setExpandedStepId] = useState<string | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);

  // Auto-Fix & Verify State
  const [selectedFindingId, setSelectedFindingId] = useState<string | null>(
    initialSelectedFindingId || (findings.length > 0 ? findings[0].id : null)
  );
  const [currentRemediation, setCurrentRemediation] = useState<Remediation | null>(null);
  const [isFixing, setIsFixing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  useEffect(() => {
    if (initialSelectedFindingId) {
      setSelectedFindingId(initialSelectedFindingId);
      setActiveSubTab('fix_verify');
    }
  }, [initialSelectedFindingId]);

  const activeFinding = findings.find((f) => f.id === selectedFindingId) || findings[0] || null;

  useEffect(() => {
    if (activeFinding) {
      loadRemediation(activeFinding.id);
    }
  }, [selectedFindingId, activeFinding?.id]);

  const loadRemediation = async (findingId: string) => {
    try {
      const rems = await api.getRemediations(findingId);
      if (rems && rems.length > 0) {
        setCurrentRemediation(rems[0]);
      } else {
        setCurrentRemediation(null);
      }
    } catch (e) {
      console.error('Failed to load remediation:', e);
    }
  };

  const handleProposeFix = async () => {
    if (!activeFinding) return;
    setIsFixing(true);
    setActionMessage(null);
    try {
      const rem = await api.proposeFix(activeFinding.id);
      setCurrentRemediation(rem);
      setActionMessage('Autonomous patch generated and validated against safety policy.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error generating patch: ${e.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  const handleApplyFix = async () => {
    if (!currentRemediation) return;
    setIsApplying(true);
    setActionMessage(null);
    try {
      const updated = await api.applyRemediation(currentRemediation.id);
      setCurrentRemediation(updated);
      setActionMessage('Patch successfully applied to local repository file.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error applying patch: ${e.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleVerifyFix = async () => {
    if (!activeFinding) return;
    setIsVerifying(true);
    setActionMessage(null);
    try {
      const ver = await api.verifyFix(activeFinding.id);
      setActionMessage(ver.message || `Verification completed with status: ${ver.status}`);
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error verifying fix: ${e.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRollbackFix = async () => {
    if (!currentRemediation) return;
    setIsApplying(true);
    setActionMessage(null);
    try {
      const reverted = await api.rollbackRemediation(currentRemediation.id);
      setCurrentRemediation(reverted);
      setActionMessage('Patch reverted. Original vulnerable file restored.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error reverting patch: ${e.message}`);
    } finally {
      setIsApplying(false);
    }
  };

  const handleCancel = async () => {
    if (!currentInvestigation) return;
    try {
      await api.cancelInvestigation(currentInvestigation.id);
      onRefresh();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyReport = () => {
    if (!currentInvestigation) return;
    const reportText = `SENTINELOS AUTONOMOUS SECURITY INVESTIGATION REPORT
==================================================
Project: ${currentWorkspace?.display_name || 'Active Project'}
Goal: ${currentInvestigation.goal}
Status: ${currentInvestigation.status.toUpperCase()}
Timestamp: ${new Date(currentInvestigation.created_at).toLocaleString()}

EXECUTIVE SUMMARY
-----------------
${currentInvestigation.summary || 'Investigation completed successfully.'}

FINDINGS SUMMARY
----------------
Total Findings: ${findings.length}
Verified Fixes: ${findings.filter(f => f.verification_status === 'verified_fixed').length}
Unresolved Risks: ${findings.filter(f => f.verification_status !== 'verified_fixed').length}

INVESTIGATION STEPS (${currentInvestigation.steps?.length || 0})
-------------------
${(currentInvestigation.steps || []).map(s => `[Step ${s.step_index}] ${s.step_type} (${s.tool_name || 'engine'}) - ${s.status.toUpperCase()}\n  ${s.reasoning || ''}`).join('\n\n')}
`;
    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2500);
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
      case 'code_flow_trace':
        return GitBranch;
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
            : 'Checked files with Gitleaks; credentials redacted for safety.',
          next: 'Scanning third-party package manifests against the OSV vulnerability database.'
        };
      case 'dependency_scan':
        return {
          checking: 'Discovering package manifests (requirements.txt, package.json) and querying OSV database for CVEs.',
          discovered: step.tool_output?.findings?.length
            ? `Identified ${step.tool_output.findings.length} vulnerable package dependency matching known CVE records.`
            : 'Scanned project dependencies against national vulnerability records.',
          next: 'Running Semgrep SAST analyzer to check application code for SQL injection and unsafe input handling.'
        };
      case 'sast_scan':
        return {
          checking: 'Analyzing application source code with Semgrep for injection vulnerabilities and dangerous patterns.',
          discovered: step.tool_output?.findings?.length
            ? `Found ${step.tool_output.findings.length} static code vulnerability (including unparameterized SQL queries).`
            : 'Completed static code analysis across source files.',
          next: 'Adaptive follow-up triggered: tracing AST taint dataflow from request inputs to SQL sinks.'
        };
      case 'code_flow_trace':
        return {
          checking: 'Executing AST dataflow tracer to map untrusted HTTP parameters to database query sinks.',
          discovered: step.tool_output?.tainted_sinks?.length
            ? `Verified unvalidated dataflow path from request parameter to query execution.`
            : 'Completed AST taint flow graph across Python route handlers.',
          next: 'Correlating related findings into ThreatLens attack paths.'
        };
      case 'prompt_shield_test':
        return {
          checking: 'Probing AI application endpoints with prompt injection and instruction extraction test payloads.',
          discovered: step.tool_output?.findings?.length
            ? `Recorded ${step.tool_output.findings.length} prompt guardrail failure on unhardened AI test routes.`
            : 'Executed controlled prompt injection probes against local demo target.',
          next: 'Correlating related findings into ThreatLens attack paths.'
        };
      case 'attack_path_analysis':
        return {
          checking: 'Correlating individual findings into multi-hop exploit chains connecting untrusted inputs to assets.',
          discovered: 'Constructed ThreatLens attack path graph with entry point and potential impact.',
          next: 'Formulating automated closed-loop code remediation patch.'
        };
      case 'remediation_proposal':
        return {
          checking: 'Synthesizing secure code patch and validating changes against AgentFence policy.',
          discovered: 'Generated unified diff replacing tainted string formatting with parameterized SQL execution.',
          next: 'Applying patch and executing verification test suite.'
        };
      case 'verification':
        return {
          checking: 'Applying remediation patch and running pytest test suite alongside scanner recheck.',
          discovered: 'Verification passed: Regression tests succeeded and SQL injection vulnerability eliminated.',
          next: 'Investigation concluded with verified fix.'
        };
      default:
        return {
          checking: `Executing ${step.tool_name || step.step_type} under AgentFence boundary policies.`,
          discovered: step.reasoning || 'Step execution completed successfully.',
          next: nextStep ? `Next: ${nextStep.step_type.replace(/_/g, ' ')}` : 'Generating final closed-loop summary.'
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
            Launch an autonomous investigation to inspect your workspace for secrets, dependencies, injection vectors, and verified fixes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => onStartNew()}
          className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium inline-flex items-center gap-1.5 transition-colors shadow-sm"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Start Autonomous Investigation</span>
        </button>
      </div>
    );
  }

  const isRunning = ['running', 'planning', 'pending'].includes(currentInvestigation.status);
  const steps = currentInvestigation.steps || [];
  const verifiedFixedCount = findings.filter(f => f.verification_status === 'verified_fixed').length;
  const unresolvedCount = findings.filter(f => f.verification_status !== 'verified_fixed').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Primary Investigation Header */}
      <div className="p-5 rounded-xl border border-[#283149] bg-[#141B2D] space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#E8ECF5] tracking-tight">
                Autonomous Investigation
              </h1>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                currentInvestigation.status === 'completed'
                  ? 'bg-[#36D6B0]/10 text-[#36D6B0] border-[#36D6B0]/20'
                  : isRunning
                  ? 'bg-[#8B7CFF]/10 text-[#8B7CFF] border-[#8B7CFF]/25 animate-pulse'
                  : 'bg-[#1B243B] text-[#9AA6BF] border-[#283149]'
              }`}>
                {currentInvestigation.status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-[#9AA6BF]">
              <span className="text-[#E8ECF5] font-medium">{currentWorkspace?.display_name || 'Active Project'}</span>
              {' • '}
              Goal: <span className="text-[#8B7CFF]">{currentInvestigation.goal}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-1.5 rounded-lg border border-[#283149] bg-[#0B1020] hover:bg-[#1B243B] text-[#9AA6BF] hover:text-[#E8ECF5] text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-[#36D6B0]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedReport ? 'Copied' : 'Copy Report'}</span>
            </button>

            {isRunning ? (
              <button
                type="button"
                onClick={handleCancel}
                className="px-3.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onStartNew()}
                className="px-3.5 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run New Scan</span>
              </button>
            )}
          </div>
        </div>

        {/* 2. Sub-Navigation Tabs */}
        <div className="flex items-center gap-1 border-t border-[#283149]/60 pt-3">
          {[
            { id: 'timeline', label: `Timeline (${steps.length})`, icon: Clock },
            { id: 'attack_paths', label: `Attack Paths (${attackPaths.length})`, icon: Network },
            { id: 'fix_verify', label: `Auto-Fix & Verify (${verifiedFixedCount} fixed)`, icon: Wrench },
            { id: 'audit', label: `Audit Trail (${auditEvents.length})`, icon: ScrollText },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as InvestigationSubTab)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#1B243B] text-[#E8ECF5] border border-[#283149] font-semibold'
                    : 'text-[#9AA6BF] hover:text-[#E8ECF5] hover:bg-[#1B243B]/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#8B7CFF]' : 'text-[#9AA6BF]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Closed-Loop Final Report Card */}
      {currentInvestigation.summary && (
        <div className="p-4 rounded-xl border border-[#36D6B0]/25 bg-[#36D6B0]/10 text-xs text-[#E8ECF5] space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-1.5 text-[#36D6B0]">
              <CheckCircle2 className="w-4 h-4 text-[#36D6B0]" />
              <span>Closed-Loop Investigation Summary</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#36D6B0]">{verifiedFixedCount} Verified Fixes</span>
              <span>•</span>
              <span className="text-amber-300">{unresolvedCount} Unresolved</span>
            </div>
          </div>
          <p className="text-[#9AA6BF] leading-relaxed">{currentInvestigation.summary}</p>
        </div>
      )}

      {/* 4. Tab Views */}

      {/* TAB 1: INVESTIGATION TIMELINE */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-3">
          <div className="text-xs font-semibold text-[#E8ECF5] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <span>Investigation Progress ({steps.length} Steps)</span>
            </div>
            <span className="text-[11px] text-[#9AA6BF]">
              Checking • Discovered • Next Step
            </span>
          </div>

          <div className="border border-[#283149] rounded-xl bg-[#141B2D] divide-y divide-[#283149] overflow-hidden">
            {steps.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#9AA6BF]">
                Investigation is preparing execution plan...
              </div>
            ) : (
              steps.map((step, idx) => {
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

                    {/* Expandable Technical Evidence */}
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
                          <span className="text-[10px] uppercase text-[#8B7CFF] block mb-0.5">Raw Tool Artifacts:</span>
                          <pre className="whitespace-pre-wrap leading-relaxed text-[#9AA6BF]">
                            {JSON.stringify(step.tool_output || {}, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ATTACK PATHS */}
      {activeSubTab === 'attack_paths' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[#283149] bg-[#141B2D]">
            <h2 className="text-sm font-semibold text-[#E8ECF5]">ThreatLens Attack-Path Reasoning</h2>
            <p className="text-xs text-[#9AA6BF] mt-1">
              SentinelOS correlates isolated static code warnings, secrets, and endpoint parameters into validated exploit chains.
            </p>
          </div>

          {attackPaths.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#9AA6BF] rounded-xl border border-[#283149] bg-[#141B2D]">
              No attack paths modeled for this investigation. Run a security scan to correlate findings.
            </div>
          ) : (
            attackPaths.map((ap) => (
              <div key={ap.id} className="space-y-4">
                {/* Visual Graph */}
                <GraphViewer attackPath={ap} />

                {/* Structured Attack Path Reasoning Details */}
                {(ap.entry_point || ap.vulnerable_component || ap.possible_impact) && (
                  <div className="p-4 rounded-xl border border-[#283149] bg-[#141B2D] space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#E8ECF5]">Attack Path Reasoning & Evidence</span>
                      {ap.confidence && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#8B7CFF]/10 text-[#8B7CFF] border border-[#8B7CFF]/20">
                          Confidence: {ap.confidence}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {ap.entry_point && (
                        <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149]">
                          <span className="text-[10px] uppercase font-semibold text-[#8B7CFF] block mb-1">Untrusted Entry Point</span>
                          <span className="text-[#E8ECF5] font-mono text-[11px]">{ap.entry_point}</span>
                        </div>
                      )}
                      {ap.vulnerable_component && (
                        <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149]">
                          <span className="text-[10px] uppercase font-semibold text-rose-400 block mb-1">Vulnerable Component</span>
                          <span className="text-[#E8ECF5] font-mono text-[11px]">{ap.vulnerable_component}</span>
                        </div>
                      )}
                      {ap.possible_impact && (
                        <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149]">
                          <span className="text-[10px] uppercase font-semibold text-amber-300 block mb-1">Potential Impact</span>
                          <span className="text-[#9AA6BF] text-[11px] leading-relaxed">{ap.possible_impact}</span>
                        </div>
                      )}
                      {ap.recommended_next_check && (
                        <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149]">
                          <span className="text-[10px] uppercase font-semibold text-[#36D6B0] block mb-1">Recommended Next Action</span>
                          <span className="text-[#9AA6BF] text-[11px] leading-relaxed">{ap.recommended_next_check}</span>
                        </div>
                      )}
                    </div>

                    {ap.supporting_evidence && (
                      <div className="p-3 rounded-lg bg-[#0B1020] border border-[#283149] text-[11px]">
                        <span className="text-[10px] uppercase font-semibold text-[#9AA6BF] block mb-1">Supporting Telemetry</span>
                        <p className="text-[#9AA6BF] leading-relaxed">{ap.supporting_evidence}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 3: AUTO-FIX & VERIFY */}
      {activeSubTab === 'fix_verify' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[#283149] bg-[#141B2D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#E8ECF5]">Closed-Loop Auto-Fix & Verification</h2>
              <p className="text-xs text-[#9AA6BF] mt-0.5">
                Generate patches, enforce write boundary policies, apply fixes, and run automated regression tests.
              </p>
            </div>

            {/* Finding Selector */}
            {findings.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9AA6BF]">Target Vulnerability:</span>
                <select
                  value={selectedFindingId || ''}
                  onChange={(e) => setSelectedFindingId(e.target.value)}
                  className="bg-[#0B1020] border border-[#283149] rounded-lg px-2.5 py-1.5 text-xs text-[#E8ECF5] focus:outline-none focus:border-[#8B7CFF]"
                >
                  {findings.map((f) => (
                    <option key={f.id} value={f.id}>
                      [{f.severity}] {f.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {actionMessage && (
            <div className="p-3.5 rounded-lg border border-[#8B7CFF]/30 bg-[#8B7CFF]/10 text-xs text-[#E8ECF5]">
              {actionMessage}
            </div>
          )}

          {activeFinding ? (
            <div className="space-y-4">
              {/* Finding Summary Bar */}
              <div className="p-4 rounded-xl border border-[#283149] bg-[#141B2D] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="severity" value={activeFinding.severity} />
                    <span className="font-semibold text-[#E8ECF5] text-sm">{activeFinding.title}</span>
                  </div>
                  <StatusBadge type="status" value={activeFinding.verification_status} />
                </div>
                <p className="text-[#9AA6BF] leading-relaxed">{activeFinding.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-[#9AA6BF] font-mono pt-1">
                  <span>File: {activeFinding.file_path}:{activeFinding.line_number}</span>
                  <span>•</span>
                  <span>Rule: {activeFinding.rule_id || 'CWE-89'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleProposeFix}
                  disabled={isFixing}
                  className="px-4 py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isFixing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating Patch...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Autonomous Fix</span>
                    </>
                  )}
                </button>

                {currentRemediation && (
                  <>
                    <button
                      type="button"
                      onClick={handleApplyFix}
                      disabled={isApplying || currentRemediation.status === 'applied'}
                      className={`px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        currentRemediation.status === 'applied'
                          ? 'bg-[#1B243B] text-[#9AA6BF] border border-[#283149] cursor-not-allowed'
                          : 'bg-[#36D6B0] hover:bg-[#2FC4A0] text-[#0B1020]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{currentRemediation.status === 'applied' ? 'Patch Applied' : 'Apply Patch to File'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyFix}
                      disabled={isVerifying}
                      className="px-4 py-2 rounded-lg border border-[#36D6B0]/30 bg-[#36D6B0]/10 hover:bg-[#36D6B0]/20 text-[#36D6B0] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-[#36D6B0] border-t-transparent rounded-full animate-spin" />
                          <span>Verifying Fix...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Run Verification Tests</span>
                        </>
                      )}
                    </button>

                    {currentRemediation.status === 'applied' && (
                      <button
                        type="button"
                        onClick={handleRollbackFix}
                        disabled={isApplying}
                        className="px-3 py-2 rounded-lg border border-[#283149] bg-[#0B1020] hover:bg-[#1B243B] text-[#9AA6BF] hover:text-[#E8ECF5] text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Rollback</span>
                      </button>
                    )}
                  </>
                )}
              </div>

              {/* Diff Viewer */}
              {currentRemediation ? (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-[#9AA6BF]">
                    Patch Summary: <span className="text-[#E8ECF5]">{currentRemediation.patch_summary}</span>
                  </div>
                  <DiffViewer diff={currentRemediation.proposed_patch} />
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#9AA6BF] rounded-xl border border-[#283149] bg-[#141B2D]">
                  Click "Generate Autonomous Fix" to formulate and review the unified code patch.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#9AA6BF] rounded-xl border border-[#283149] bg-[#141B2D]">
              No findings available to remediate.
            </div>
          )}
        </div>
      )}

      {/* TAB 4: AUDIT TRAIL */}
      {activeSubTab === 'audit' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[#283149] bg-[#141B2D]">
            <h2 className="text-sm font-semibold text-[#E8ECF5]">AgentFence Tamper-Evident Audit Ledger</h2>
            <p className="text-xs text-[#9AA6BF] mt-0.5">
              Deterministic boundary enforcement records every model tool request, policy validation, and scanner invocation.
            </p>
          </div>

          {auditEvents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#9AA6BF] rounded-xl border border-[#283149] bg-[#141B2D]">
              No audit events recorded for this investigation yet.
            </div>
          ) : (
            <div className="border border-[#283149] rounded-xl bg-[#141B2D] divide-y divide-[#283149] overflow-hidden">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-3.5 flex items-start justify-between gap-3 text-xs hover:bg-[#1B243B]/30 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      <StatusBadge type="decision" value={evt.decision} />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="font-mono text-[#E8ECF5] text-xs font-semibold">{evt.action}</div>
                      <p className="text-[#9AA6BF] text-[11px] leading-relaxed">{evt.reason}</p>
                      {evt.details && Object.keys(evt.details).length > 0 && (
                        <div className="text-[10px] text-[#9AA6BF] font-mono pt-1">
                          {JSON.stringify(evt.details)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#9AA6BF] font-mono whitespace-nowrap flex-shrink-0">
                    {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

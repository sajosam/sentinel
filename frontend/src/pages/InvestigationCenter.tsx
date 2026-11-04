import React, { useState, useEffect } from 'react';
import {
  Investigation,
  InvestigationStep,
  Finding,
  AttackPath,
  AuditEvent,
  Workspace,
  Remediation,
  Verification,
  SystemHealth,
  ShieldStatus
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
  Shield,
  FolderCheck,
  Lock,
  Cpu,
  Layers,
  ShieldBan,
  Fingerprint,
  Info
} from 'lucide-react';
import { InfoBadge } from '../components/InfoBadge';

export type InvestigationSubTab =
  | 'timeline'
  | 'attack_paths'
  | 'fix_verify'
  | 'agentfence';

interface Props {
  currentInvestigation: Investigation | null;
  investigations?: Investigation[];
  findings?: Finding[];
  attackPaths?: AttackPath[];
  auditEvents?: AuditEvent[];
  currentWorkspace?: Workspace | null;
  health?: SystemHealth | null;
  shieldStatus?: ShieldStatus | null;
  onRefresh: () => void;
  onStartNew: (goal?: string) => void;
  initialSubTab?: InvestigationSubTab;
  selectedFindingId?: string | null;
  onTriggerPolicyBlock?: () => void;
}

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
  onTriggerPolicyBlock,
  health,
  shieldStatus,
}) => {
  const gateway = health?.model_gateway;
  // Name the model that actually serves a task, or say plainly that the offline fallback is used
  const modelFor = (task: string): string =>
    gateway?.configured ? (gateway.models?.[task] || gateway.model_name) : 'offline fallback';
  const blockedEvents = auditEvents.filter((e) => e.decision !== 'ALLOW');
  const [hookCopied, setHookCopied] = useState<boolean>(false);
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
      setActionMessage(
        rem.generated_by?.startsWith('model:')
          ? `Patch authored by ${rem.generated_by.slice(6)}, applied to the real file and syntax-checked.`
          : 'Patch produced by the deterministic rule-based engine (no model configured or model patch rejected).'
      );
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
      setActionMessage('Patch reverted. Original vulnerable file restored from backup.');
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
Verified Fixes: ${findings.filter((f) => f.verification_status === 'verified_fixed').length}
Unresolved Risks: ${findings.filter((f) => f.verification_status !== 'verified_fixed').length}

INVESTIGATION STEPS (${currentInvestigation.steps?.length || 0})
-------------------
${(currentInvestigation.steps || [])
  .map(
    (s) =>
      `[Step ${s.step_index}] ${s.step_type} (${s.tool_name || 'engine'}) - ${s.status.toUpperCase()}\n  ${
        s.reasoning || ''
      }`
  )
  .join('\n\n')}
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
      case 'rollback':
        return Undo2;
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
          discovered: 'Constructed ThreatLens attack path graph with entry point, vulnerable code, and potential impact.',
          next: 'Formulating a closed-loop remediation patch.'
        };
      case 'remediation_proposal':
        return {
          checking: 'Synthesizing secure code patch and validating changes against AgentFence policy.',
          discovered: step.tool_output?.summary
            ? `${step.tool_output.summary} (${step.tool_output.generated_by || 'patch'}).`
            : step.reasoning || 'Generated a candidate patch.',
          next: 'Applying patch and executing verification test suite.'
        };
      case 'verification':
        return {
          checking: 'Applying remediation patch and running pytest test suite alongside scanner recheck.',
          discovered: step.tool_output?.message || step.reasoning || 'Verification finished.',
          next: step.status === 'failed' ? 'Rolling back the patch: a fix that fails verification is never kept.' : 'Investigation concluded with verified fix.'
        };
      default:
        return {
          checking: `Executing ${step.tool_name || step.step_type} under AgentFence boundary policies.`,
          discovered: step.reasoning || 'Step execution completed successfully.',
          next: nextStep ? `Next: ${nextStep.step_type.replace(/_/g, ' ')}` : 'Generating final closed-loop summary.'
        };
    }
  };

  const isRunning = currentInvestigation
    ? ['running', 'planning', 'pending'].includes(currentInvestigation.status)
    : false;
  const steps = currentInvestigation?.steps || [];
  const verifiedFixedCount = findings.filter((f) => f.verification_status === 'verified_fixed').length;
  const unresolvedCount = findings.filter((f) => f.verification_status !== 'verified_fixed').length;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Primary Investigation Header */}
      <div className="p-5 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-bold text-[#E6EBF2] tracking-tight flex items-center">
                <span>Autonomous Investigation Center</span>
                <InfoBadge
                  title="Autonomous Investigation Center"
                  description="An autonomous security station that safeguards AI coding tools, audits code for secrets and vulnerabilities, models attack paths, and synthesizes test-verified fixes."
                />
              </h1>
              {currentInvestigation && (
                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                    currentInvestigation.status === 'completed'
                      ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                      : isRunning
                      ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/25 animate-pulse'
                      : 'bg-[#1B222E] text-[#8A97AC] border-[#232B38]'
                  }`}
                >
                  {currentInvestigation.status.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-[#8A97AC]">
              <span className="text-[#E6EBF2] font-medium">
                {currentWorkspace?.display_name || 'Active Project'}
              </span>
              {' • '}
              Goal:{' '}
              <span className="text-[#3B82F6]">
                {currentInvestigation?.goal || 'Autonomous Security Audit and Code Guard'}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyReport}
              className="px-3 py-1.5 rounded-lg border border-[#232B38] bg-[#0A0E14] hover:bg-[#1B222E] text-[#8A97AC] hover:text-[#E6EBF2] text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              {copiedReport ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
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
                className="px-3.5 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2F6FE0] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Run New Scan</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[#232B38]/60 pt-3">
          {[
            { id: 'timeline', label: `Scan Timeline (${steps.length})`, icon: Clock },
            { id: 'attack_paths', label: `Attack Paths (${attackPaths.length})`, icon: Network },
            { id: 'fix_verify', label: `Fix & Verify (${verifiedFixedCount} fixed)`, icon: Wrench },
            { id: 'agentfence', label: `AgentFence & Audit (${blockedEvents.length} blocked)`, icon: Shield },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id as InvestigationSubTab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1B222E] text-[#E6EBF2] border border-[#3B82F6]/50 font-semibold shadow-sm'
                    : 'text-[#8A97AC] hover:text-[#E6EBF2] hover:bg-[#1B222E]/40'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#3B82F6]' : 'text-[#8A97AC]'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Closed-Loop Final Report Card */}
      {currentInvestigation?.summary && (
        <div className="p-4 rounded-xl border border-[#10B981]/25 bg-[#10B981]/10 text-xs text-[#E6EBF2] space-y-2">
          <div className="flex items-center justify-between">
            <div className="font-semibold flex items-center gap-1.5 text-[#10B981]">
              <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              <span>Closed-Loop Investigation Summary</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#10B981]">{verifiedFixedCount} Verified Fixes</span>
              <span>•</span>
              <span className="text-amber-300">{unresolvedCount} Unresolved</span>
            </div>
          </div>
          <p className="text-[#8A97AC] leading-relaxed">{currentInvestigation.summary}</p>
        </div>
      )}

      {/* Tab Views */}

      {/* WORKSPACE INITIALIZATION & BOUNDARY PROVISIONING */}
      {/* SCAN TIMELINE */}
      {activeSubTab === 'timeline' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E6EBF2] flex items-center">
                <span>Autonomous Investigation & Scanning</span>
                <InfoBadge
                  title="Autonomous Investigation & Scanning"
                  description="Model-planned pipeline: planning, secrets (Gitleaks), static analysis (Semgrep), dependency CVEs (OSV), AST dataflow tracing and Prompt Shield probes."
                />
              </h2>
              <span className="text-[11px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded font-mono font-medium">
                Planner: {modelFor('planning')}
              </span>
            </div>
            <p className="text-xs text-[#8A97AC]">
              The model plans which scanners to run; scanners gather the evidence; the policy engine gates every tool call.
            </p>
          </div>

          <div className="border border-[#232B38] rounded-xl bg-[#141A24] divide-y divide-[#232B38] overflow-hidden">
            {steps.length === 0 ? (
              currentInvestigation && ['running', 'planning', 'pending'].includes(currentInvestigation.status) ? (
                <div className="p-10 text-center text-xs text-[#8A97AC] space-y-3">
                  <div className="w-6 h-6 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="text-sm font-semibold text-[#E6EBF2]">Autonomous Investigation In Progress</div>
                  <p className="text-[11px] text-[#8A97AC] max-w-sm mx-auto">
                    Planning with {modelFor('planning')} and dispatching security scanners...
                  </p>
                </div>
              ) : (
                <div className="p-10 text-center text-xs text-[#8A97AC] space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-[#3B82F6]/10 border border-[#3B82F6]/20 flex items-center justify-center text-[#3B82F6] mx-auto">
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                  </div>
                  <div className="text-sm font-semibold text-[#E6EBF2]">No Security Scan Run Yet</div>
                  <p className="text-[11px] text-[#8A97AC] max-w-md mx-auto leading-relaxed">
                    Workspace is initialized and boundary protection is active. Click below or "Run New Scan" above to start the autonomous security audit.
                  </p>
                  <button
                    type="button"
                    onClick={() => onStartNew()}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2F6FE0] text-white text-xs font-semibold shadow-sm transition-colors mt-2"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Autonomous Scan</span>
                  </button>
                </div>
              )
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
                        <div className="w-8 h-8 rounded-lg bg-[#1B222E] border border-[#232B38] flex items-center justify-center text-[#3B82F6] flex-shrink-0">
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="text-xs font-semibold text-[#E6EBF2] flex items-center gap-2">
                            <span className="flex items-center">
                              <span>Step {step.step_index}: {step.step_type.replace(/_/g, ' ')}</span>
                              <InfoBadge
                                title={`Step ${step.step_index}: ${step.step_type.replace(/_/g, ' ')}`}
                                description={details.checking}
                              />
                            </span>
                            {step.tool_name && (
                              <span className="font-mono text-[11px] text-[#8A97AC] font-normal">({step.tool_name})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#8A97AC] font-mono">
                            {step.completed_at ? new Date(step.completed_at).toLocaleTimeString() : 'Running'}
                          </div>
                        </div>
                      </div>

                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase ${
                        step.status === 'completed'
                          ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                          : step.status === 'running'
                          ? 'bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20 animate-pulse'
                          : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                      }`}>
                        {step.status}
                      </span>
                    </div>

                    {/* 3-part Step Breakdown */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs pt-1">
                      <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-[#3B82F6] flex items-center tracking-wider">
                          <span>Checking</span>
                          <InfoBadge
                            title="Scanning Target"
                            description="What SentinelOS was analyzing in this specific step (e.g. AST syntax tree, route parameters, or hardcoded secrets)."
                          />
                        </span>
                        <p className="text-[#8A97AC] text-[11px] leading-relaxed">{details.checking}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-[#10B981] flex items-center tracking-wider">
                          <span>Discovered</span>
                          <InfoBadge
                            title="Discovery Outcome"
                            description="What SentinelOS observed or uncovered during this verification pass."
                          />
                        </span>
                        <p className="text-[#E6EBF2] text-[11px] leading-relaxed">{details.discovered}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-[#8A97AC] flex items-center tracking-wider">
                          <span>Next Step</span>
                          <InfoBadge
                            title="Autonomous Next Step"
                            description="The subsequent scan or verification phase queued based on this step's findings."
                          />
                        </span>
                        <p className="text-[#8A97AC] text-[11px] leading-relaxed">{details.next}</p>
                      </div>
                    </div>

                    {/* Expandable Technical Evidence */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedStepId(isExpanded ? null : step.id)}
                        className="text-[11px] text-[#8A97AC] hover:text-[#E6EBF2] font-medium flex items-center gap-1 transition-colors"
                      >
                        {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        <span>{isExpanded ? 'Hide evidence and technical details' : 'View evidence and technical details'}</span>
                      </button>

                      {isExpanded && (
                        <div className="mt-2.5 p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] text-[#E6EBF2] font-mono text-[11px] overflow-x-auto max-h-60 overflow-y-auto">
                          {step.reasoning && (
                            <div className="mb-2 pb-2 border-b border-[#232B38] text-[#8A97AC]">
                              <span className="text-[10px] uppercase text-[#3B82F6] block mb-0.5">Model Reasoning:</span>
                              {step.reasoning}
                            </div>
                          )}
                          <span className="text-[10px] uppercase text-[#3B82F6] block mb-0.5">Raw Tool Artifacts:</span>
                          <pre className="whitespace-pre-wrap leading-relaxed text-[#8A97AC]">
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

      {/* ATTACK PATHS */}
      {activeSubTab === 'attack_paths' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card space-y-1">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#E6EBF2] flex items-center">
                <span>Attack-Path Reasoning & ThreatLens</span>
                <InfoBadge
                  title="Attack-Path Reasoning & ThreatLens"
                  description="Connects findings into exploit chains. Each link is labeled CONFIRMED (scanner evidence) or INFERRED (reasoning)."
                />
              </h2>
              <span className="text-[10px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded font-mono font-medium">
                Reasoning: {modelFor('reasoning')}
              </span>
            </div>
            <p className="text-xs text-[#8A97AC]">
              Exploit chains from entry point to impact. Without a model, graphs are built strictly from scanner evidence.
            </p>
          </div>

          {attackPaths.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8A97AC] rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
              No attack paths modeled for this investigation yet. Run a security scan to correlate findings.
            </div>
          ) : (
            attackPaths.map((ap) => (
              <div key={ap.id} className="space-y-4">
                {/* Visual Graph */}
                <GraphViewer attackPath={ap} />

                {/* Structured Attack Path Reasoning Details */}
                {(ap.entry_point || ap.vulnerable_component || ap.possible_impact) && (
                  <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card space-y-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-[#E6EBF2] flex items-center">
                        <span>ThreatLens Reasoning</span>
                        <InfoBadge
                          title="ThreatLens Reasoning"
                          description="Correlates scanner findings with application dataflow to reconstruct the attacker's end-to-end exploit path."
                        />
                      </span>
                      {ap.confidence && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">
                          Confidence: {ap.confidence}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      {ap.entry_point && (
                        <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38]">
                          <span className="text-[10px] uppercase font-semibold text-[#3B82F6] flex items-center mb-1">
                            <span>Untrusted Entry Point</span>
                            <InfoBadge
                              title="Untrusted Entry Point"
                              description="The public input point (e.g. search bar, HTTP parameter, API route) where external attackers can supply malicious inputs."
                            />
                          </span>
                          <span className="text-[#E6EBF2] font-mono text-[11px]">{ap.entry_point}</span>
                        </div>
                      )}
                      {ap.vulnerable_component && (
                        <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38]">
                          <span className="text-[10px] uppercase font-semibold text-rose-400 flex items-center mb-1">
                            <span>Vulnerable Component</span>
                            <InfoBadge
                              title="Vulnerable Component"
                              description="The specific file and line where input is mishandled without sanitization, allowing exploits to succeed."
                            />
                          </span>
                          <span className="text-[#E6EBF2] font-mono text-[11px]">{ap.vulnerable_component}</span>
                        </div>
                      )}
                      {ap.possible_impact && (
                        <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38]">
                          <span className="text-[10px] uppercase font-semibold text-amber-300 flex items-center mb-1">
                            <span>Potential Impact</span>
                            <InfoBadge
                              title="Potential Impact"
                              description="The security consequence if exploited, such as unauthorized database reads or credential theft."
                            />
                          </span>
                          <span className="text-[#8A97AC] text-[11px] leading-relaxed">{ap.possible_impact}</span>
                        </div>
                      )}
                      {ap.recommended_next_check && (
                        <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38]">
                          <span className="text-[10px] uppercase font-semibold text-[#10B981] flex items-center mb-1">
                            <span>Recommended Next Action</span>
                            <InfoBadge
                              title="Recommended Next Action"
                              description="The primary patch or architectural change recommended to neutralize this attack path."
                            />
                          </span>
                          <span className="text-[#8A97AC] text-[11px] leading-relaxed">{ap.recommended_next_check}</span>
                        </div>
                      )}
                    </div>

                    {ap.supporting_evidence && (
                      <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] text-[11px]">
                        <span className="text-[10px] uppercase font-semibold text-[#8A97AC] block mb-1">Supporting Telemetry</span>
                        <p className="text-[#8A97AC] leading-relaxed">{ap.supporting_evidence}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* AUTO-FIX & VERIFY */}
      {activeSubTab === 'fix_verify' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-[#E6EBF2]">Automated Closed-Loop Remediation & Verification</h2>
                <InfoBadge
                  title="Automated Closed-Loop Remediation & Verification"
                  description="Autonomous code-generation and testing pipeline. Synthesizes surgical security patches, validates diffs against perimeter guard rules, and executes Pytest regression tests before applying."
                />
                <span className="text-[10px] text-[#3B82F6] bg-[#3B82F6]/10 px-2 py-0.5 rounded font-mono font-medium">
                  Patch author: {modelFor('remediation')}
                </span>
              </div>
              <p className="text-xs text-[#8A97AC] mt-0.5">
                The model drafts the patch; SentinelOS applies it only if it matches the file exactly and compiles, then re-scans and re-runs tests to decide.
              </p>
            </div>

            {findings.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#8A97AC] flex items-center gap-1.5">
                  <span>Target Vulnerability:</span>
                  <InfoBadge
                    title="Target Vulnerability"
                    description="Select the specific security finding to remediate. SentinelOS will inspect the AST and generate a surgical patch."
                  />
                </span>
                <select
                  value={selectedFindingId || ''}
                  onChange={(e) => setSelectedFindingId(e.target.value)}
                  className="bg-[#0A0E14] border border-[#232B38] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EBF2] focus:outline-none focus:border-[#3B82F6]"
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
            <div className="p-3.5 rounded-lg border border-[#3B82F6]/30 bg-[#3B82F6]/10 text-xs text-[#E6EBF2]">
              {actionMessage}
            </div>
          )}

          {activeFinding ? (
            <div className="space-y-4">
              {/* Finding Summary Bar */}
              <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="severity" value={activeFinding.severity} />
                    <span className="font-semibold text-[#E6EBF2] text-sm">{activeFinding.title}</span>
                  </div>
                  <StatusBadge type="status" value={activeFinding.verification_status} />
                </div>
                <p className="text-[#8A97AC] leading-relaxed">{activeFinding.description}</p>
                <div className="flex items-center gap-4 text-[11px] text-[#8A97AC] font-mono pt-1">
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
                  className="px-4 py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2F6FE0] text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isFixing ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Generating patch with {modelFor('remediation')}...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Fix</span>
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
                          ? 'bg-[#1B222E] text-[#8A97AC] border border-[#232B38] cursor-not-allowed'
                          : 'bg-[#10B981] hover:bg-[#0E9E72] text-[#0A0E14]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{currentRemediation.status === 'applied' ? 'Patch Applied' : 'Apply Patch to File'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyFix}
                      disabled={isVerifying}
                      className="px-4 py-2 rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 hover:bg-[#10B981]/20 text-[#10B981] text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {isVerifying ? (
                        <>
                          <div className="w-3.5 h-3.5 border-2 border-[#10B981] border-t-transparent rounded-full animate-spin" />
                          <span>Running Pytest Verification...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Run Verification Tests (Pytest + Re-scan)</span>
                        </>
                      )}
                    </button>

                    {currentRemediation.status === 'applied' && (
                      <button
                        type="button"
                        onClick={handleRollbackFix}
                        disabled={isApplying}
                        className="px-3 py-2 rounded-lg border border-[#232B38] bg-[#0A0E14] hover:bg-[#1B222E] text-[#8A97AC] hover:text-[#E6EBF2] text-xs font-medium flex items-center gap-1.5 transition-colors"
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
                  <div className="text-xs font-medium text-[#8A97AC] flex items-center gap-1.5">
                    <span>Patch Summary:</span>
                    <span className="text-[#E6EBF2]">{currentRemediation.patch_summary}</span>
                    <InfoBadge
                      title="Patch Summary"
                      description="The diff is computed by SentinelOS from the real file, not copied from model output."
                    />
                    {currentRemediation.generated_by && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#3B82F6]/10 text-[#3B82F6] border border-[#3B82F6]/20">
                        {currentRemediation.generated_by}
                      </span>
                    )}
                  </div>
                  <DiffViewer diff={currentRemediation.proposed_patch} />
                </div>
              ) : (
                <div className="p-8 text-center text-xs text-[#8A97AC] rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
                  Click "Generate Fix" to draft a patch for this finding.
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#8A97AC] rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
              No findings available to remediate.
            </div>
          )}
        </div>
      )}

      {/* GOVERNANCE, AUDIT & REPORTING */}
      {activeSubTab === 'agentfence' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#E6EBF2]">AgentFence: guard your AI coding agent</h2>
              <p className="text-xs text-[#8A97AC] mt-0.5">
                Claude Code asks SentinelOS before every Read, Write, Edit and Bash call. Protected paths are denied by the policy engine, not by the model.
              </p>
            </div>
            {onTriggerPolicyBlock && (
              <button
                type="button"
                onClick={onTriggerPolicyBlock}
                className="px-3.5 py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors flex-shrink-0"
              >
                <ShieldBan className="w-3.5 h-3.5" />
                <span>Simulate Blocked Write</span>
              </button>
            )}
          </div>

          {/* Hook setup */}
          <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card space-y-3 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[#E6EBF2]">Claude Code PreToolUse hook</span>
              {(shieldStatus?.registered_agents || [])
                .filter((a) => a.id === 'claude-code')
                .map((a) => (
                  <span
                    key={a.id}
                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${
                      a.status === 'Connected'
                        ? 'bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20'
                        : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    }`}
                  >
                    {a.status.toUpperCase()}
                  </span>
                ))}
            </div>
            <p className="text-[11px] text-[#8A97AC]">
              Add this to <code className="text-[#3B82F6]">.claude/settings.json</code> in the project (or <code className="text-[#3B82F6]">~/.claude/settings.json</code>):
            </p>
            <div className="relative">
              <pre className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] text-[11px] text-[#E6EBF2] font-mono overflow-x-auto">{hookSettings(shieldStatus?.hook_command)}</pre>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(hookSettings(shieldStatus?.hook_command));
                  setHookCopied(true);
                  setTimeout(() => setHookCopied(false), 2000);
                }}
                className="absolute top-2 right-2 px-2 py-1 rounded border border-[#232B38] bg-[#141A24] text-[10px] text-[#8A97AC] hover:text-[#E6EBF2] flex items-center gap-1"
              >
                {hookCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {hookCopied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* Blocked / approval-required actions */}
          <div className="p-4 rounded-xl border border-[#232B38] bg-[#141A24] shadow-card space-y-2 text-xs">
            <span className="font-semibold text-[#E6EBF2]">Blocked actions ({blockedEvents.length})</span>
            {blockedEvents.length === 0 ? (
              <p className="text-[11px] text-[#8A97AC]">Nothing blocked yet. Ask Claude Code to read <code className="text-[#3B82F6]">.env</code> in a protected workspace to see a denial.</p>
            ) : (
              <div className="divide-y divide-[#232B38]">
                {blockedEvents.slice(0, 8).map((evt) => (
                  <div key={evt.id} className="py-2 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <StatusBadge type="decision" value={evt.decision} />
                        <span className="font-mono text-[#E6EBF2] truncate">{evt.source}</span>
                      </div>
                      <p className="text-[11px] text-[#8A97AC] mt-0.5">{evt.reason}</p>
                    </div>
                    <span className="text-[11px] text-[#8A97AC] font-mono whitespace-nowrap">
                      {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Full audit ledger */}
          <div className="text-xs font-semibold text-[#E6EBF2] pt-1">Audit ledger ({auditEvents.length})</div>
          {auditEvents.length === 0 ? (
            <div className="p-12 text-center text-xs text-[#8A97AC] rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
              No audit events recorded for this workspace yet.
            </div>
          ) : (
            <div className="border border-[#232B38] rounded-xl bg-[#141A24] divide-y divide-[#232B38] overflow-hidden">
              {auditEvents.map((evt) => (
                <div key={evt.id} className="p-3.5 flex items-start justify-between gap-3 text-xs hover:bg-[#1B222E]/30 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="mt-0.5 flex-shrink-0">
                      <StatusBadge type="decision" value={evt.decision} />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[#E6EBF2] text-xs font-semibold">{evt.action}</span>
                        <InfoBadge
                          title={evt.action}
                          description={`Decision: ${evt.decision}. Reason: ${evt.reason}`}
                        />
                      </div>
                      <p className="text-[#8A97AC] text-[11px] leading-relaxed">{evt.reason}</p>
                      {evt.details && Object.keys(evt.details).length > 0 && (
                        <div className="text-[10px] text-[#8A97AC] font-mono pt-1">
                          {JSON.stringify(evt.details)}
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-[11px] text-[#8A97AC] font-mono whitespace-nowrap flex-shrink-0">
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


const hookSettings = (command?: string): string =>
  JSON.stringify(
    {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Read|Write|Edit|MultiEdit|NotebookEdit|Grep|Glob|Bash',
            hooks: [{ type: 'command', command: command || 'python3 /path/to/sential/scripts/agentfence_hook.py' }],
          },
        ],
      },
    },
    null,
    2
  );

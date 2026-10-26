import React, { useState, useEffect } from 'react';
import { Finding, Remediation, Verification } from '../types';
import { api } from '../api/client';
import { DiffViewer } from '../components/DiffViewer';
import { StatusBadge } from '../components/StatusBadge';
import {
  Wrench,
  CheckCircle2,
  RotateCcw,
  Play,
  FileCode,
  ShieldCheck,
  AlertTriangle,
  Sparkles
} from 'lucide-react';

interface Props {
  findings: Finding[];
  selectedFinding: Finding | null;
  onRefresh: () => void;
}

export const FixVerify: React.FC<Props> = ({ findings, selectedFinding: initialFinding, onRefresh }) => {
  const [activeFinding, setActiveFinding] = useState<Finding | null>(initialFinding || findings[0] || null);
  const [currentRemediation, setCurrentRemediation] = useState<Remediation | null>(null);
  const [verificationResult, setVerificationResult] = useState<Verification | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (initialFinding) {
      setActiveFinding(initialFinding);
    }
  }, [initialFinding]);

  useEffect(() => {
    if (activeFinding) {
      loadRemediationData(activeFinding.id);
    }
  }, [activeFinding]);

  const loadRemediationData = async (findingId: string) => {
    setIsLoading(true);
    setActionMessage(null);
    try {
      const rems = await api.getRemediations(findingId);
      if (rems && rems.length > 0) {
        setCurrentRemediation(rems[0]);
      } else {
        setCurrentRemediation(null);
      }
      setVerificationResult(null);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProposeFix = async () => {
    if (!activeFinding) return;
    setIsLoading(true);
    try {
      const rem = await api.proposeFix(activeFinding.id);
      setCurrentRemediation(rem);
      setActionMessage('Proposed patch generated successfully.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyPatch = async () => {
    if (!currentRemediation) return;
    setIsLoading(true);
    try {
      const updated = await api.applyRemediation(currentRemediation.id);
      setCurrentRemediation(updated);
      setActionMessage('Patch successfully applied to workspace file under Policy Engine enforcement.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!activeFinding) return;
    setIsLoading(true);
    try {
      const ver = await api.verifyFix(activeFinding.id);
      setVerificationResult(ver);
      setActionMessage('Verification complete: Reran security scanner and regression test suite.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!currentRemediation) return;
    setIsLoading(true);
    try {
      const reverted = await api.rollbackRemediation(currentRemediation.id);
      setCurrentRemediation(reverted);
      setActionMessage('Patch rolled back. File restored to previous backup state.');
      onRefresh();
    } catch (e: any) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!activeFinding) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl glass-panel space-y-4">
        <Wrench className="w-8 h-8 text-slate-500 mx-auto" />
        <h3 className="text-base font-bold text-slate-200">No Finding Selected</h3>
        <p className="text-xs text-slate-400">Please select a finding from the Findings tab to review patches and trigger verification.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Target Finding Selector & Overview Header */}
      <div className="p-6 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <StatusBadge type="severity" value={activeFinding.severity} />
            <span className="text-xs text-slate-400 font-mono">{activeFinding.file_path} {activeFinding.line_number && `:${activeFinding.line_number}`}</span>
            <StatusBadge type="status" value={activeFinding.verification_status} />
          </div>
          <h2 className="text-lg font-bold text-slate-100">{activeFinding.title}</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">{activeFinding.description}</p>
        </div>

        {/* Change Target Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Target Finding:</span>
          <select
            value={activeFinding.id}
            onChange={(e) => {
              const f = findings.find((x) => x.id === e.target.value);
              if (f) setActiveFinding(f);
            }}
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 max-w-xs truncate"
          >
            {findings.map((f) => (
              <option key={f.id} value={f.id}>
                [{f.severity}] {f.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 rounded-xl border border-sky-900/50 bg-sky-950/30 text-xs text-sky-300 font-medium animate-fadeIn">
          {actionMessage}
        </div>
      )}

      {/* Main Diff & Remediation Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Diff Viewer (8 cols) */}
        <div className="lg:col-span-8 p-5 rounded-2xl border border-slate-800 bg-[#0b101c] space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <FileCode className="w-4 h-4 text-sky-400" />
              <h3 className="text-sm font-bold text-slate-100">Proposed Unified Diff Patch</h3>
            </div>
            {currentRemediation && (
              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                currentRemediation.status === 'applied'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : currentRemediation.status === 'reverted'
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                Status: {currentRemediation.status}
              </span>
            )}
          </div>

          {currentRemediation ? (
            <div className="space-y-3">
              <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                <span className="font-semibold text-slate-200 block mb-0.5">Patch Objective:</span>
                {currentRemediation.patch_summary}
              </div>
              <DiffViewer diff={currentRemediation.proposed_patch} />
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500 space-y-3">
              <p>No remediation patch proposed for this finding yet.</p>
              <button
                onClick={handleProposeFix}
                disabled={isLoading}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs inline-flex items-center gap-2 glow-blue"
              >
                <Sparkles className="w-3.5 h-3.5 fill-current" />
                <span>Generate Suggested Patch</span>
              </button>
            </div>
          )}
        </div>

        {/* Right: Controls & Verification Engine (4 cols) */}
        <div className="lg:col-span-4 p-5 rounded-2xl border border-slate-800 bg-[#0b101c] flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-2 border-b border-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Remediation & Verification Gate</span>
            </h3>

            {/* Workflow Control Buttons */}
            <div className="space-y-2.5">
              {!currentRemediation && (
                <button
                  onClick={handleProposeFix}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 glow-blue transition-all"
                >
                  <Sparkles className="w-3.5 h-3.5 fill-current" />
                  <span>Propose Safe Patch</span>
                </button>
              )}

              {currentRemediation && currentRemediation.status === 'proposed' && (
                <button
                  onClick={handleApplyPatch}
                  disabled={isLoading}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 glow-green transition-all"
                >
                  <Wrench className="w-3.5 h-3.5 fill-current" />
                  <span>Apply Patch to Workspace</span>
                </button>
              )}

              {currentRemediation && currentRemediation.status === 'applied' && (
                <>
                  <button
                    onClick={handleVerify}
                    disabled={isLoading}
                    className="w-full py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 glow-blue transition-all"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Run Verification & Tests</span>
                  </button>

                  <button
                    onClick={handleRollback}
                    disabled={isLoading}
                    className="w-full py-2 px-3 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Rollback Changes</span>
                  </button>
                </>
              )}
            </div>

            {/* Verification Results Display */}
            {verificationResult && (
              <div className={`p-4 rounded-xl border mt-4 text-xs space-y-2 ${
                verificationResult.status === 'passed'
                  ? 'border-emerald-800 bg-emerald-950/30 text-emerald-200'
                  : 'border-rose-800 bg-rose-950/30 text-rose-200'
              }`}>
                <div className="flex items-center justify-between font-bold">
                  <span className="uppercase tracking-wider">Verification Result:</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-mono ${
                    verificationResult.status === 'passed' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'
                  }`}>
                    {verificationResult.status}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed">{verificationResult.message}</p>
                {verificationResult.test_output && (
                  <div className="mt-2 text-[10px] font-mono bg-black/40 p-2 rounded max-h-[120px] overflow-y-auto text-slate-300">
                    {verificationResult.test_output}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/50 text-[11px] text-slate-400">
            <strong>Security Principle:</strong> The model never self-certifies fixes. The Verification Engine reruns real security tools and tests to determine whether the vulnerability remains.
          </div>
        </div>
      </div>
    </div>
  );
};

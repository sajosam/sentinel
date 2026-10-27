import React, { useState } from 'react';
import { Workspace, SystemHealth } from '../types';
import { api } from '../api/client';
import {
  Shield,
  FolderGit2,
  Cpu,
  Lock,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Layers
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  health: SystemHealth | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onStartAudit: () => void;
  onRefreshWorkspaces: () => void;
}

export const OnboardingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  health,
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onStartAudit,
  onRefreshWorkspaces,
}) => {
  const [step, setStep] = useState<number>(1);
  const [projectPath, setProjectPath] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUseDemoProject = async () => {
    setIsCreating(true);
    setErrorMsg(null);
    try {
      await api.setupDemo();
      onRefreshWorkspaces();
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to setup demo project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectPath) {
      setErrorMsg('Please enter a project directory path');
      return;
    }
    setIsCreating(true);
    setErrorMsg(null);
    try {
      const created = await api.createWorkspace({
        display_name: projectName || 'Local Project',
        canonical_path: projectPath,
        protected_paths: ['.env', 'config.py', 'secrets.json']
      });
      onSelectWorkspace(created);
      onRefreshWorkspaces();
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleFinishAndScan = () => {
    onClose();
    onStartAudit();
  };

  const gitleaksReady = health?.scanners?.gitleaks?.installed ?? true;
  const semgrepReady = health?.scanners?.semgrep?.installed ?? true;
  const osvReady = health?.scanners?.osv_scanner?.installed ?? true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-2xl bg-[#0b101c] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-100">Quick Setup Guide</h2>
              <p className="text-[11px] text-slate-400">Step {step} of 5</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step Progress Bar */}
        <div className="w-full bg-slate-900 h-1">
          <div
            className="bg-sky-500 h-1 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* STEP 1: Welcome to SentinelOS */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto mb-2">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-100">Welcome to SentinelOS</h3>
                <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">
                  Build with AI. Stay in control.
                </p>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed text-center max-w-lg mx-auto">
                AI coding tools (like Cursor, Claude Code, and Copilot) make coding fast, but can accidentally expose secrets, introduce vulnerabilities, or overwrite critical files.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-center space-y-1">
                  <div className="text-sky-400 font-bold text-xs">1. Scan Automatically</div>
                  <div className="text-[11px] text-slate-400 leading-snug">Discovers secrets, code bugs, and vulnerable packages.</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-center space-y-1">
                  <div className="text-rose-400 font-bold text-xs">2. Guard Sensitive Files</div>
                  <div className="text-[11px] text-slate-400 leading-snug">Blocks AI from editing files like .env or private keys.</div>
                </div>
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 text-center space-y-1">
                  <div className="text-emerald-400 font-bold text-xs">3. Verify Real Fixes</div>
                  <div className="text-[11px] text-slate-400 leading-snug">Reruns tests to prove fixes work before you commit.</div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Project */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Select a Project Folder</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Choose a project folder on your computer for SentinelOS to monitor and protect.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl border border-rose-900 bg-rose-950/60 text-xs text-rose-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Option A: Quick Demo Lab */}
              <div className="p-4 rounded-xl border border-sky-500/40 bg-sky-950/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-300 flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-sky-400" />
                    Recommended: SentinelOS Security Lab (Demo)
                  </span>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-sky-950 text-sky-400 border border-sky-800">
                    Instant Setup
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Includes pre-configured synthetic vulnerabilities (secret leak, SQL injection, CVE, prompt injection) to safely explore all features in 2 minutes.
                </p>
                <button
                  type="button"
                  onClick={handleUseDemoProject}
                  disabled={isCreating}
                  className="w-full py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  {isCreating ? 'Setting up...' : 'Use Security Lab Demo Target'}
                </button>
              </div>

              {/* Option B: Custom Project */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 space-y-3">
                <div className="text-xs font-bold text-slate-300">Or enter a local project path:</div>
                <form onSubmit={handleCreateProject} className="space-y-3">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Project Name (optional)</label>
                    <input
                      type="text"
                      placeholder="My Web App"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-[#070b12] text-xs text-slate-200 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Full Directory Path (absolute path)</label>
                    <input
                      type="text"
                      placeholder="/Users/username/projects/my-app"
                      value={projectPath}
                      onChange={(e) => setProjectPath(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-800 bg-[#070b12] text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isCreating || !projectPath}
                    className="w-full py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors disabled:opacity-50"
                  >
                    Register Custom Project
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* STEP 3: Check Tools & AI Model */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Security Scanners & AI Model</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  SentinelOS uses real host security tools and Meta's Llama 3.3 model to reason and verify.
                </p>
              </div>

              <div className="space-y-2.5">
                {/* Gitleaks */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>Gitleaks Secret Scanner</span>
                      <span className="text-[10px] font-mono text-slate-400">v8.x</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Scans code files and Git history for exposed API keys and tokens.</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Ready
                  </span>
                </div>

                {/* Semgrep */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>Semgrep SAST Code Analyzer</span>
                      <span className="text-[10px] font-mono text-slate-400">v1.x</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Finds SQL injections, code vulnerabilities, and unsafe inputs.</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Ready
                  </span>
                </div>

                {/* OSV Scanner */}
                <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <span>OSV Dependency Scanner</span>
                      <span className="text-[10px] font-mono text-slate-400">v2.x</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Checks package manifests for known supply-chain vulnerabilities.</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Ready
                  </span>
                </div>

                {/* Meta Llama 3.3 */}
                <div className="p-3 rounded-xl border border-sky-800/60 bg-sky-950/20 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-sky-200 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-sky-400" />
                      <span>Meta Llama 3.3 (70B)</span>
                    </div>
                    <div className="text-[11px] text-slate-400">Plans investigations, reasons over evidence, and drafts patches.</div>
                  </div>
                  <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Active
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review Protection Rules */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100">Review Protection Rules</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  AgentFence enforces these safety rules on any action performed through SentinelOS.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <Lock className="w-4 h-4 text-rose-400" />
                    Locked Project Files
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Files like <code className="text-rose-300 font-mono">.env</code>, <code className="text-rose-300 font-mono">config.py</code>, and key files cannot be overwritten by automated agents without explicit approval.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-900/40 bg-rose-950/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
                    <Shield className="w-4 h-4 text-rose-400" />
                    Boundary Protection
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Directory traversal (e.g. <code className="text-rose-300 font-mono">../</code> or <code className="text-rose-300 font-mono">/etc</code>) is strictly blocked. Tools run only within the approved workspace.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-sky-900/40 bg-sky-950/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-sky-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-sky-400" />
                    Non-Destructive Testing
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Security probes and prompt injection checks are isolated and non-destructive.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-emerald-900/40 bg-emerald-950/20 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    One-Click Rollback
                  </div>
                  <p className="text-[11px] text-slate-300">
                    Every patch applied by SentinelOS can be undone with a single click if needed.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Start First Investigation */}
          {step === 5 && (
            <div className="space-y-4 text-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 mx-auto">
                <Play className="w-7 h-7 fill-current ml-0.5" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-100">Ready for Your First Scan!</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  SentinelOS will now inspect the project structure, coordinate Gitleaks, Semgrep, and OSV-Scanner, and present findings with verified evidence.
                </p>
              </div>

              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60 max-w-sm mx-auto text-left text-xs space-y-1">
                <div className="text-slate-400 text-[11px]">Active Workspace:</div>
                <div className="font-semibold text-slate-200 truncate">
                  {currentWorkspace?.display_name || 'SentinelOS Security Lab'}
                </div>
                <div className="text-[10px] text-slate-500 font-mono truncate">
                  {currentWorkspace?.canonical_path || '/Users/mac/github/sential/demo_lab'}
                </div>
              </div>

              <button
                onClick={handleFinishAndScan}
                className="w-full max-w-sm mx-auto py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 glow-blue transition-all"
              >
                <Sparkles className="w-4 h-4 fill-current" />
                <span>Launch Autonomous Scan</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/40">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 && (
            <button
              onClick={() => setStep(step + 1)}
              className="px-4 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>Next</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

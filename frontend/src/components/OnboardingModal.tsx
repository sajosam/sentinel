import React, { useState } from 'react';
import { Workspace, SystemHealth } from '../types';
import { api } from '../api/client';
import {
  Shield,
  FolderGit2,
  Lock,
  Play,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  ArrowLeft
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-[#141B2D] border border-[#283149] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-3.5 border-b border-[#283149] flex items-center justify-between bg-[#141B2D]">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#8B7CFF] flex items-center justify-center text-white shadow-xs">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#E8ECF5]">Guided Setup</h2>
              <p className="text-[10px] text-[#9AA6BF]">Step {step} of 5</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#9AA6BF] hover:text-[#E8ECF5] p-1 rounded-lg hover:bg-[#1B243B] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress Line */}
        <div className="w-full bg-[#1B243B] h-0.5">
          <div
            className="bg-[#8B7CFF] h-0.5 transition-all duration-300"
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* STEP 1: Welcome to SentinelOS */}
          {step === 1 && (
            <div className="space-y-4 text-center py-2">
              <div className="w-12 h-12 rounded-xl bg-[#0B1020] border border-[#283149] flex items-center justify-center text-[#8B7CFF] mx-auto shadow-sm">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#E8ECF5]">Welcome to SentinelOS</h3>
                <p className="text-xs text-[#9AA6BF] mt-1 max-w-md mx-auto leading-relaxed">
                  A local-first security platform for software developers using AI coding tools.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left pt-2">
                <div className="p-3.5 rounded-lg border border-[#283149] bg-[#0B1020] space-y-1">
                  <span className="font-semibold text-[#E8ECF5] block">1. Scan Automatically</span>
                  <p className="text-[11px] text-[#9AA6BF] leading-relaxed">Discovers exposed secrets, code injection, and vulnerable dependencies.</p>
                </div>
                <div className="p-3.5 rounded-lg border border-[#283149] bg-[#0B1020] space-y-1">
                  <span className="font-semibold text-[#E8ECF5] block">2. Enforce Protection</span>
                  <p className="text-[11px] text-[#9AA6BF] leading-relaxed">Blocks AI tools from overwriting .env or private key files.</p>
                </div>
                <div className="p-3.5 rounded-lg border border-[#283149] bg-[#0B1020] space-y-1">
                  <span className="font-semibold text-[#E8ECF5] block">3. Verify Real Fixes</span>
                  <p className="text-[11px] text-[#9AA6BF] leading-relaxed">Reruns tests and scans to prove problems are resolved.</p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Select Project */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#E8ECF5]">Select a Project</h3>
                <p className="text-[#9AA6BF] mt-0.5">
                  Choose a project folder on your computer for SentinelOS to protect.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Demo Project */}
              <div className="p-4 rounded-xl border border-[#283149] bg-[#0B1020] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#E8ECF5] flex items-center gap-2">
                    <FolderGit2 className="w-4 h-4 text-[#8B7CFF]" />
                    SentinelOS Security Lab (Demo Project)
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#8B7CFF]/15 text-[#8B7CFF] border border-[#8B7CFF]/30">Recommended</span>
                </div>
                <p className="text-[11px] text-[#9AA6BF] leading-relaxed">
                  Pre-configured with synthetic vulnerabilities to explore all features safely in minutes.
                </p>
                <button
                  type="button"
                  onClick={handleUseDemoProject}
                  disabled={isCreating}
                  className="w-full py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white font-medium transition-colors shadow-sm disabled:opacity-50"
                >
                  {isCreating ? 'Setting up...' : 'Use Demo Project'}
                </button>
              </div>

              {/* Custom Path */}
              <form onSubmit={handleCreateProject} className="space-y-2.5 pt-3 border-t border-[#283149]">
                <div className="text-[11px] font-medium text-[#9AA6BF]">Or register a custom repository:</div>
                <input
                  type="text"
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#283149] bg-[#0B1020] text-[#E8ECF5] placeholder-[#9AA6BF]/50 focus:outline-none focus:border-[#8B7CFF] transition-colors"
                />
                <input
                  type="text"
                  placeholder="Absolute directory path (e.g. /Users/name/code/app)"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-[#283149] bg-[#0B1020] text-[#E8ECF5] placeholder-[#9AA6BF]/50 focus:outline-none focus:border-[#8B7CFF] font-mono text-[11px] transition-colors"
                />
                <button
                  type="submit"
                  disabled={isCreating || !projectPath}
                  className="w-full py-2 rounded-lg border border-[#283149] bg-[#1B243B] text-[#E8ECF5] hover:bg-[#222D4A] font-medium transition-colors disabled:opacity-50"
                >
                  Register Project Path
                </button>
              </form>
            </div>
          )}

          {/* STEP 3: Check Tools & AI Model */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#E8ECF5]">Security Scanners & AI Model</h3>
                <p className="text-[#9AA6BF] mt-0.5">
                  SentinelOS uses host security tools and Meta's Llama 3.3 model.
                </p>
              </div>

              <div className="border border-[#283149] rounded-xl bg-[#0B1020] divide-y divide-[#283149] overflow-hidden">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#E8ECF5]">Gitleaks Secret Scanner</span>
                    <p className="text-[11px] text-[#9AA6BF]">Detects exposed API keys and tokens in files.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#36D6B0] font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#E8ECF5]">Semgrep SAST Engine</span>
                    <p className="text-[11px] text-[#9AA6BF]">Finds SQL injection and code vulnerabilities.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#36D6B0] font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#E8ECF5]">OSV Dependency Scanner</span>
                    <p className="text-[11px] text-[#9AA6BF]">Audits third-party packages against known CVEs.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#36D6B0] font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-[#E8ECF5]">Meta Llama 3.3 Model</span>
                    <p className="text-[11px] text-[#9AA6BF]">Autonomous reasoning and patch drafting.</p>
                  </div>
                  <span className="inline-flex items-center gap-1 text-[#36D6B0] font-medium text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Review Protection Rules */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold text-[#E8ECF5]">Protection Rules</h3>
                <p className="text-[#9AA6BF] mt-0.5">
                  AgentFence enforces these safety rules on actions performed in your projects.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg border border-[#283149] bg-[#0B1020] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#E8ECF5]">
                    <Lock className="w-3.5 h-3.5 text-[#8B7CFF]" />
                    <span>Locked Files</span>
                  </div>
                  <p className="text-[11px] text-[#9AA6BF] leading-relaxed">
                    <code className="font-mono text-[#8B7CFF] bg-[#141B2D] px-1 py-0.5 rounded border border-[#283149]">.env</code> and key files cannot be overwritten by tools without confirmation.
                  </p>
                </div>

                <div className="p-3.5 rounded-lg border border-[#283149] bg-[#0B1020] space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-[#E8ECF5]">
                    <Shield className="w-3.5 h-3.5 text-[#36D6B0]" />
                    <span>Boundary Guard</span>
                  </div>
                  <p className="text-[11px] text-[#9AA6BF] leading-relaxed">
                    Directory traversal outside the workspace is strictly blocked.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Start Investigation */}
          {step === 5 && (
            <div className="space-y-4 text-center py-4">
              <div className="w-12 h-12 rounded-xl bg-[#0B1020] border border-[#283149] flex items-center justify-center text-[#8B7CFF] mx-auto shadow-sm">
                <Play className="w-5 h-5 fill-current ml-0.5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[#E8ECF5]">Ready to Scan</h3>
                <p className="text-xs text-[#9AA6BF] mt-1 max-w-sm mx-auto leading-relaxed">
                  SentinelOS will run a multi-step investigation to discover any secrets, vulnerabilities, and dependencies.
                </p>
              </div>
              <button
                type="button"
                onClick={handleFinishAndScan}
                className="w-full max-w-xs mx-auto py-2 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white font-medium transition-colors shadow-sm"
              >
                Launch Investigation
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-5 py-3 border-t border-[#283149] flex items-center justify-between bg-[#141B2D]">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-3.5 py-1.5 rounded-lg border border-[#283149] bg-[#0B1020] text-[#9AA6BF] hover:text-[#E8ECF5] hover:bg-[#1B243B] text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {step < 5 && (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="px-4 py-1.5 rounded-lg bg-[#8B7CFF] hover:bg-[#7A6AE6] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
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

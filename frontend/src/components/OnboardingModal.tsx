import React, { useState } from 'react';
import { Workspace, SystemHealth } from '../types';
import { api } from '../api/client';
import { FolderSelector } from './FolderSelector';
import {
  Shield,
  FolderGit2,
  GitBranch,
  FolderOpen,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  health: SystemHealth | null;
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onStartAudit: (goal?: string, overrideWorkspaceId?: string) => Promise<void> | void;
  onRefreshWorkspaces: () => void;
}

type Busy = null | 'demo' | 'clone' | 'local';

export const OnboardingModal: React.FC<Props> = ({
  isOpen,
  onClose,
  health,
  onSelectWorkspace,
  onStartAudit,
  onRefreshWorkspaces,
}) => {
  const [repoUrl, setRepoUrl] = useState<string>('');
  const [projectPath, setProjectPath] = useState<string>('');
  const [projectName, setProjectName] = useState<string>('');
  const [busy, setBusy] = useState<Busy>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Every option ends the same way: select the workspace and launch the investigation
  const connectAndScan = async (kind: Busy, connect: () => Promise<Workspace>) => {
    setBusy(kind);
    setErrorMsg(null);
    try {
      const ws = await connect();
      onSelectWorkspace(ws);
      onRefreshWorkspaces();
      onClose();
      await onStartAudit(undefined, ws.id);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect project');
    } finally {
      setBusy(null);
    }
  };

  const handleDemo = () =>
    connectAndScan('demo', async () => {
      const res = await api.setupDemo();
      return api.getWorkspace(res.workspace_id);
    });

  const handleClone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;
    connectAndScan('clone', () => api.cloneWorkspace(repoUrl.trim()));
  };

  const handleLocal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectPath) return;
    connectAndScan('local', () =>
      api.createWorkspace({
        display_name: projectName || 'Local Project',
        canonical_path: projectPath,
        protected_paths: ['.env', 'secrets.json']
      })
    );
  };

  const gateway = health?.model_gateway;
  const scanners = health?.scanners;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl bg-[#141A24] border border-[#232B38] rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-5 py-3.5 border-b border-[#232B38] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-[#3B82F6] flex items-center justify-center text-white">
              <Shield className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="text-xs font-semibold text-[#E6EBF2]">Connect a project</h2>
              <p className="text-[10px] text-[#8A97AC]">SentinelOS scans it, models attack paths, then fixes and verifies.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-[#8A97AC] hover:text-[#E6EBF2] p-1 rounded-lg hover:bg-[#1B222E] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto text-xs">
          {/* Readiness: real values from /api/health */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            <ReadyChip ok={!!gateway?.configured} label={gateway?.configured ? `Model: ${gateway.model_name}` : 'Model: offline fallback'} />
            <ReadyChip ok={!!scanners?.semgrep.installed} label="Semgrep" />
            <ReadyChip ok={!!scanners?.gitleaks.installed} label="Gitleaks" />
            <ReadyChip ok={!!scanners?.osv_scanner.installed} label="OSV-Scanner" />
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-500/10 text-rose-300 border border-rose-500/20 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Security Lab */}
          <div className="p-4 rounded-xl border border-[#232B38] bg-[#0A0E14] space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[#E6EBF2] flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#3B82F6]" />
                SentinelOS Security Lab
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#3B82F6]/15 text-[#3B82F6] border border-[#3B82F6]/30">Demo</span>
            </div>
            <p className="text-[11px] text-[#8A97AC]">Small app with a planted secret, SQL injection, vulnerable dependency and prompt-injection endpoint.</p>
            <button
              type="button"
              onClick={handleDemo}
              disabled={busy !== null}
              className="w-full py-2 rounded-lg bg-[#3B82F6] hover:bg-[#2F6FE0] text-white font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy === 'demo' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Scan Security Lab
            </button>
          </div>

          {/* 2. Public Git repository */}
          <form onSubmit={handleClone} className="p-4 rounded-xl border border-[#232B38] bg-[#0A0E14] space-y-3">
            <span className="font-semibold text-[#E6EBF2] flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#3B82F6]" />
              Public Git repository
            </span>
            <p className="text-[11px] text-[#8A97AC]">Shallow-cloned locally. Its own code is never executed (tests are skipped).</p>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://github.com/owner/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="flex-1 min-w-0 px-3 py-1.5 rounded-lg border border-[#232B38] bg-[#141A24] text-[#E6EBF2] placeholder-[#8A97AC]/50 focus:outline-none focus:border-[#3B82F6] font-mono"
              />
              <button
                type="submit"
                disabled={busy !== null || !repoUrl.trim()}
                className="px-3.5 py-1.5 rounded-lg border border-[#232B38] bg-[#1B222E] text-[#E6EBF2] hover:bg-[#222B38] font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {busy === 'clone' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {busy === 'clone' ? 'Cloning…' : 'Clone & Scan'}
              </button>
            </div>
          </form>

          {/* 3. Local folder */}
          <form onSubmit={handleLocal} className="p-4 rounded-xl border border-[#232B38] bg-[#0A0E14] space-y-3">
            <span className="font-semibold text-[#E6EBF2] flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-[#3B82F6]" />
              Local folder
            </span>
            <FolderSelector
              selectedPath={projectPath}
              onSelect={(path, name) => {
                setProjectPath(path);
                if (name && !projectName) setProjectName(name);
              }}
            />
            <button
              type="submit"
              disabled={busy !== null || !projectPath}
              className="w-full py-2 rounded-lg border border-[#232B38] bg-[#1B222E] text-[#E6EBF2] hover:bg-[#222B38] font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy === 'local' && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Scan Folder
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const ReadyChip: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-1 rounded border ${
      ok ? 'border-[#10B981]/30 text-[#10B981] bg-[#10B981]/10' : 'border-amber-500/30 text-amber-300 bg-amber-500/10'
    }`}
  >
    {ok ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
    {label}
  </span>
);

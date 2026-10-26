import React, { useState } from 'react';
import { Workspace } from '../types';
import { api } from '../api/client';
import {
  FolderGit2,
  Plus,
  Play,
  Lock,
  Calendar,
  CheckCircle2,
  Layers,
  FolderOpen
} from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onStartAudit: () => void;
  onRefresh: () => void;
}

export const Workspaces: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onStartAudit,
  onRefresh,
}) => {
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [canonicalPath, setCanonicalPath] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canonicalPath) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const created = await api.createWorkspace({
        display_name: displayName || 'Project Workspace',
        canonical_path: canonicalPath,
        protected_paths: ['.env', 'config.py', 'secrets.json']
      });
      setShowAddModal(false);
      setDisplayName('');
      setCanonicalPath('');
      onSelectWorkspace(created);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FolderGit2 className="w-5 h-5 text-sky-400" />
            <span>Protected Workspaces</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registered project repositories governed by SentinelOS boundary verification and Shield Mode.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-2 glow-blue transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add Workspace</span>
        </button>
      </div>

      {/* Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {workspaces.map((ws) => {
          const isSelected = currentWorkspace?.id === ws.id;
          return (
            <div
              key={ws.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                isSelected
                  ? 'border-sky-500 bg-[#0f172a]/80 glow-blue'
                  : 'border-slate-800 bg-[#0b101c] hover:border-slate-700'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                    {ws.project_type}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-bold text-sky-400 bg-sky-950 px-2 py-0.5 rounded border border-sky-800">
                      CURRENT
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100">{ws.display_name}</h3>
                  <div className="mt-1 text-xs text-slate-400 font-mono truncate" title={ws.canonical_path}>
                    {ws.canonical_path}
                  </div>
                </div>

                {/* Protected Paths Summary */}
                <div className="space-y-1">
                  <span className="text-[10px] uppercase font-semibold text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-400" />
                    Protected Files ({ws.protected_paths?.length || 0})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {(ws.protected_paths || []).slice(0, 3).map((p, idx) => (
                      <span key={idx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <Calendar className="w-3 h-3" />
                  <span>{ws.last_analyzed_at ? new Date(ws.last_analyzed_at).toLocaleDateString() : 'Never Scanned'}</span>
                </div>

                <div className="flex items-center gap-2">
                  {!isSelected && (
                    <button
                      onClick={() => onSelectWorkspace(ws)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                    >
                      Select
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onSelectWorkspace(ws);
                      onStartAudit();
                    }}
                    className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-400 hover:bg-sky-500/30 font-medium text-xs flex items-center gap-1"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Audit</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Workspace Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#0d1322] p-6 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-sky-400" />
                <span>Register Local Workspace</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                &times;
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-900 text-rose-300 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleCreateWorkspace} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Project Name</label>
                <input
                  type="text"
                  placeholder="e.g., Payment Gateway Service"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  Canonical Directory Path on Host <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder="/Users/username/projects/my-app"
                  value={canonicalPath}
                  onChange={(e) => setCanonicalPath(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 font-mono focus:outline-none focus:border-sky-500"
                />
                <p className="mt-1 text-[11px] text-slate-500">
                  Must be a valid existing absolute directory. Traversal outside this directory will be denied by PolicyEngine.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 rounded-lg border border-slate-800 text-slate-400 hover:bg-slate-900 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold"
                >
                  {isSubmitting ? 'Validating...' : 'Register Workspace'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

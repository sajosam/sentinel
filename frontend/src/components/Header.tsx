import React from 'react';
import { Workspace } from '../types';
import { Shield, Play, RotateCcw, ShieldBan, Sparkles } from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onStartInvestigation: () => void;
  onTriggerPolicyBlock: () => void;
  onResetDemo: () => void;
  isInvestigating: boolean;
}

export const Header: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onStartInvestigation,
  onTriggerPolicyBlock,
  onResetDemo,
  isInvestigating,
}) => {
  return (
    <header className="h-16 border-b border-slate-800 bg-[#0a0f1d] px-6 flex items-center justify-between z-10">
      {/* Brand & Workspace Picker */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-100 flex items-center gap-1.5">
              SentinelOS <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">Local-First</span>
            </h1>
            <p className="text-[10px] text-slate-400 -mt-0.5 font-medium">Build with AI. Stay in control.</p>
          </div>
        </div>

        {/* Workspace Selector */}
        <div className="flex items-center gap-2 pl-4 border-l border-slate-800">
          <span className="text-xs text-slate-500 font-medium">Workspace:</span>
          <select
            className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            value={currentWorkspace?.id || ''}
            onChange={(e) => {
              const ws = workspaces.find((w) => w.id === e.target.value);
              if (ws) onSelectWorkspace(ws);
            }}
          >
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>
                {w.display_name} ({w.project_type})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-3">
        {/* Reset Demo button */}
        <button
          onClick={onResetDemo}
          title="Restore Security Lab demo files to initial vulnerable state"
          className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Lab</span>
        </button>

        {/* Trigger Scenario E Policy Denial */}
        <button
          onClick={onTriggerPolicyBlock}
          title="Demonstrate Scenario E: Shield Mode independently blocks unauthorized file modification"
          className="px-3 py-1.5 rounded-lg border border-rose-900/60 bg-rose-950/30 hover:bg-rose-900/40 text-rose-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <ShieldBan className="w-3.5 h-3.5 text-rose-400" />
          <span>Test Policy Denial</span>
        </button>

        {/* Start Investigation Button */}
        <button
          onClick={onStartInvestigation}
          disabled={isInvestigating || !currentWorkspace}
          className={`px-4 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-2 transition-all shadow-sm ${
            isInvestigating
              ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
              : 'bg-sky-500 hover:bg-sky-400 text-slate-950 glow-blue'
          }`}
        >
          {isInvestigating ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-slate-500 border-t-transparent rounded-full animate-spin" />
              <span>Investigating...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Run Autonomous Audit</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
};

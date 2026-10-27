import React, { useState, useRef, useEffect } from 'react';
import { Workspace } from '../types';
import {
  ChevronDown,
  RotateCcw,
  ShieldBan,
  HelpCircle,
  FlaskConical,
  Check
} from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onTriggerPolicyBlock: () => void;
  onResetDemo: () => void;
  onOpenOnboarding: () => void;
}

export const Header: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onTriggerPolicyBlock,
  onResetDemo,
  onOpenOnboarding,
}) => {
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close demo menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsDemoMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="h-12 border-b border-slate-200 bg-white px-5 flex items-center justify-between select-none z-20 flex-shrink-0">
      {/* Active Project Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400 font-medium">Project:</span>
        <select
          className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-slate-400 cursor-pointer"
          value={currentWorkspace?.id || ''}
          onChange={(e) => {
            const ws = workspaces.find((w) => w.id === e.target.value);
            if (ws) onSelectWorkspace(ws);
          }}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id}>
              {w.display_name}
            </option>
          ))}
        </select>

        <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-slate-200 text-xs text-slate-500">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>Shield Mode Active</span>
        </div>
      </div>

      {/* Right: Demo Tools Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
          className="px-2.5 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5 text-slate-500" />
          <span>Demo Tools</span>
          <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
        </button>

        {isDemoMenuOpen && (
          <div className="absolute right-0 mt-1.5 w-56 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-30 text-xs animate-fadeIn">
            <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
              Hackathon Demo Tools
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onTriggerPolicyBlock();
              }}
              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <ShieldBan className="w-3.5 h-3.5 text-rose-500" />
              <div>
                <div className="font-medium text-slate-800">Test Policy Denial</div>
                <div className="text-[10px] text-slate-500">Trigger Scenario E host block</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onResetDemo();
              }}
              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <div>
                <div className="font-medium text-slate-800">Reset Demo Lab</div>
                <div className="text-[10px] text-slate-500">Restore initial vulnerable state</div>
              </div>
            </button>

            <div className="my-1 border-t border-slate-100" />

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onOpenOnboarding();
              }}
              className="w-full px-3 py-2 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
            >
              <HelpCircle className="w-3.5 h-3.5 text-sky-600" />
              <div>
                <div className="font-medium text-slate-800">Guided Setup</div>
                <div className="text-[10px] text-slate-500">5-step onboarding walkthrough</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

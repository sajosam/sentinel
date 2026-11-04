import React, { useState, useRef, useEffect } from 'react';
import { Workspace } from '../types';
import {
  ChevronDown,
  RotateCcw,
  ShieldBan,
  HelpCircle,
  FlaskConical,
  FolderPlus,
  Trash2
} from 'lucide-react';

interface Props {
  workspaces: Workspace[];
  currentWorkspace: Workspace | null;
  onSelectWorkspace: (ws: Workspace) => void;
  onTriggerPolicyBlock: () => void;
  onResetDemo: () => void;
  onOpenOnboarding: () => void;
  onClearAll?: () => void;
}

export const Header: React.FC<Props> = ({
  workspaces,
  currentWorkspace,
  onSelectWorkspace,
  onTriggerPolicyBlock,
  onResetDemo,
  onOpenOnboarding,
  onClearAll,
}) => {
  const [isDemoMenuOpen, setIsDemoMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    <header className="h-12 border-b border-[#232B38] bg-[#141A24] px-5 flex items-center justify-between z-20 flex-shrink-0">
      {/* Active Project Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#8A97AC] font-medium">Project:</span>
        <select
          className="bg-[#0A0E14] border border-[#232B38] rounded-md px-2.5 py-1 text-xs text-[#E6EBF2] font-medium focus:outline-none focus:border-[#3B82F6] cursor-pointer"
          value={currentWorkspace?.id || ''}
          onChange={(e) => {
            const ws = workspaces.find((w) => w.id === e.target.value);
            if (ws) onSelectWorkspace(ws);
          }}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id} className="bg-[#141A24] text-[#E6EBF2]">
              {w.display_name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={onOpenOnboarding}
          title="Add or browse project folder"
          className="px-2 py-1 rounded border border-[#232B38] bg-[#0A0E14] hover:bg-[#1B222E] text-[#8A97AC] hover:text-[#E6EBF2] text-xs flex items-center gap-1 transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span className="hidden md:inline">Open Folder</span>
        </button>

        <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-[#232B38] text-xs text-[#8A97AC]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span className="text-[#10B981] font-medium">Shield Mode Active</span>
        </div>
      </div>

      {/* Right: Security Tools Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
          className="px-2.5 py-1 rounded-md border border-[#232B38] bg-[#1B222E] hover:bg-[#222B38] text-[#E6EBF2] text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5 text-[#3B82F6]" />
          <span>Security Actions</span>
          <ChevronDown className="w-3 h-3 text-[#8A97AC] ml-0.5" />
        </button>

        {isDemoMenuOpen && (
          <div className="absolute right-0 mt-1.5 w-56 bg-[#141A24] border border-[#232B38] rounded-lg shadow-xl py-1 z-30 text-xs animate-fadeIn">
            <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-[#8A97AC] tracking-wider">
              Security & Policy Controls
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onTriggerPolicyBlock();
              }}
              className="w-full px-3 py-2 text-left text-[#E6EBF2] hover:bg-[#1B222E] flex items-center gap-2"
            >
              <ShieldBan className="w-3.5 h-3.5 text-rose-400" />
              <div>
                <div className="font-medium text-[#E6EBF2]">Test Policy Denial</div>
                <div className="text-[10px] text-[#8A97AC]">Trigger Scenario E host block</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onResetDemo();
              }}
              className="w-full px-3 py-2 text-left text-[#E6EBF2] hover:bg-[#1B222E] flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#8A97AC]" />
              <div>
                <div className="font-medium text-[#E6EBF2]">Reset Target Files</div>
                <div className="text-[10px] text-[#8A97AC]">Restore initial vulnerable state</div>
              </div>
            </button>

            {onClearAll && (
              <button
                type="button"
                onClick={() => {
                  setIsDemoMenuOpen(false);
                  if (window.confirm('Clear all workspaces and reset platform to an empty state?')) {
                    onClearAll();
                  }
                }}
                className="w-full px-3 py-2 text-left text-amber-300 hover:bg-[#1B222E] flex items-center gap-2"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-400" />
                <div>
                  <div className="font-medium text-amber-200">Clear All (Fresh Start)</div>
                  <div className="text-[10px] text-[#8A97AC]">Wipe workspaces & start empty</div>
                </div>
              </button>
            )}

            <div className="my-1 border-t border-[#232B38]" />

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onOpenOnboarding();
              }}
              className="w-full px-3 py-2 text-left text-[#E6EBF2] hover:bg-[#1B222E] flex items-center gap-2"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#3B82F6]" />
              <div>
                <div className="font-medium text-[#E6EBF2]">Guided Setup</div>
                <div className="text-[10px] text-[#8A97AC]">5-step walkthrough</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

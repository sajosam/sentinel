import React, { useState, useRef, useEffect } from 'react';
import { Workspace } from '../types';
import {
  ChevronDown,
  RotateCcw,
  ShieldBan,
  HelpCircle,
  FlaskConical
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
    <header className="h-12 border-b border-[#283149] bg-[#141B2D] px-5 flex items-center justify-between select-none z-20 flex-shrink-0">
      {/* Active Project Selector */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#9AA6BF] font-medium">Project:</span>
        <select
          className="bg-[#0B1020] border border-[#283149] rounded-md px-2.5 py-1 text-xs text-[#E8ECF5] font-medium focus:outline-none focus:border-[#8B7CFF] cursor-pointer"
          value={currentWorkspace?.id || ''}
          onChange={(e) => {
            const ws = workspaces.find((w) => w.id === e.target.value);
            if (ws) onSelectWorkspace(ws);
          }}
        >
          {workspaces.map((w) => (
            <option key={w.id} value={w.id} className="bg-[#141B2D] text-[#E8ECF5]">
              {w.display_name}
            </option>
          ))}
        </select>

        <div className="hidden sm:flex items-center gap-1.5 pl-3 border-l border-[#283149] text-xs text-[#9AA6BF]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#36D6B0]" />
          <span className="text-[#36D6B0] font-medium">Shield Mode Active</span>
        </div>
      </div>

      {/* Right: Demo Tools Menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setIsDemoMenuOpen(!isDemoMenuOpen)}
          className="px-2.5 py-1 rounded-md border border-[#283149] bg-[#1B243B] hover:bg-[#222D4A] text-[#E8ECF5] text-xs font-medium flex items-center gap-1.5 transition-colors"
        >
          <FlaskConical className="w-3.5 h-3.5 text-[#8B7CFF]" />
          <span>Demo Tools</span>
          <ChevronDown className="w-3 h-3 text-[#9AA6BF] ml-0.5" />
        </button>

        {isDemoMenuOpen && (
          <div className="absolute right-0 mt-1.5 w-56 bg-[#141B2D] border border-[#283149] rounded-lg shadow-xl py-1 z-30 text-xs animate-fadeIn">
            <div className="px-3 py-1.5 text-[10px] uppercase font-semibold text-[#9AA6BF] tracking-wider">
              Hackathon Demo Tools
            </div>

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onTriggerPolicyBlock();
              }}
              className="w-full px-3 py-2 text-left text-[#E8ECF5] hover:bg-[#1B243B] flex items-center gap-2"
            >
              <ShieldBan className="w-3.5 h-3.5 text-rose-400" />
              <div>
                <div className="font-medium text-[#E8ECF5]">Test Policy Denial</div>
                <div className="text-[10px] text-[#9AA6BF]">Trigger Scenario E host block</div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onResetDemo();
              }}
              className="w-full px-3 py-2 text-left text-[#E8ECF5] hover:bg-[#1B243B] flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#9AA6BF]" />
              <div>
                <div className="font-medium text-[#E8ECF5]">Reset Demo Lab</div>
                <div className="text-[10px] text-[#9AA6BF]">Restore initial vulnerable state</div>
              </div>
            </button>

            <div className="my-1 border-t border-[#283149]" />

            <button
              type="button"
              onClick={() => {
                setIsDemoMenuOpen(false);
                onOpenOnboarding();
              }}
              className="w-full px-3 py-2 text-left text-[#E8ECF5] hover:bg-[#1B243B] flex items-center gap-2"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#8B7CFF]" />
              <div>
                <div className="font-medium text-[#E8ECF5]">Guided Setup</div>
                <div className="text-[10px] text-[#9AA6BF]">5-step walkthrough</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};

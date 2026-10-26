import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  Bug,
  Network,
  Wrench,
  ShieldCheck,
  FolderGit2,
  ScrollText,
  Settings,
  HelpCircle,
  Activity,
  Cpu
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'investigations'
  | 'findings'
  | 'threatlens'
  | 'fix_verify'
  | 'shield_mode'
  | 'workspaces'
  | 'audit'
  | 'settings'
  | 'onboarding';

interface Props {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unresolvedCount: number;
  blockedCount: number;
  isInvestigating: boolean;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  unresolvedCount,
  blockedCount,
  isInvestigating
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'investigations', label: 'Investigation Center', icon: Terminal, badge: isInvestigating ? 'Active' : undefined },
    { id: 'findings', label: 'Findings', icon: Bug, count: unresolvedCount },
    { id: 'threatlens', label: 'Attack Paths', icon: Network },
    { id: 'fix_verify', label: 'Fix & Verify', icon: Wrench },
    { id: 'shield_mode', label: 'Shield Mode', icon: ShieldCheck, badge: blockedCount > 0 ? `${blockedCount} Blocked` : undefined },
    { id: 'workspaces', label: 'Workspaces', icon: FolderGit2 },
    { id: 'audit', label: 'Activity & Audit', icon: ScrollText },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'onboarding', label: 'Readiness & Guide', icon: HelpCircle },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 bg-[#0a0f1d] flex flex-col justify-between p-3 select-none">
      {/* Navigation Links */}
      <div className="space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Security Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-sky-950 text-sky-400 border border-sky-800">
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-rose-950 text-rose-400 border border-rose-900">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Engine Status Footer */}
      <div className="p-3 rounded-xl border border-slate-800/80 bg-slate-900/60 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="flex items-center gap-1.5 font-medium">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            Meta Llama 3.3
          </span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="text-[11px] text-slate-500 leading-tight">
          Orchestrator: LangGraph v0.2
        </div>
        <div className="text-[11px] text-slate-500 leading-tight mt-0.5">
          Gatekeeper: AgentFence Shield
        </div>
      </div>
    </aside>
  );
};

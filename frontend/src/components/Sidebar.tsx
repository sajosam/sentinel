import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Terminal,
  Bug,
  ScrollText,
  Settings,
  Cpu
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'projects'
  | 'investigations'
  | 'findings'
  | 'activity'
  | 'settings';

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
    {
      id: 'overview',
      label: 'Overview',
      icon: LayoutDashboard,
      description: 'Security at a glance'
    },
    {
      id: 'projects',
      label: 'Projects',
      icon: FolderGit2,
      description: 'Repositories & policies',
      badge: blockedCount > 0 ? `${blockedCount} Blocked` : undefined,
      badgeColor: 'rose'
    },
    {
      id: 'investigations',
      label: 'Investigations',
      icon: Terminal,
      description: 'Autonomous AI scans',
      badge: isInvestigating ? 'Running' : undefined,
      badgeColor: 'sky'
    },
    {
      id: 'findings',
      label: 'Findings',
      icon: Bug,
      description: 'Security risks & CVEs',
      count: unresolvedCount
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: ScrollText,
      description: 'Audit log & decisions'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      description: 'AI model & scanners'
    },
  ];

  return (
    <aside className="w-64 border-r border-slate-800/80 bg-[#0a0f1d] flex flex-col justify-between p-3 select-none flex-shrink-0">
      {/* Navigation Links */}
      <div className="space-y-1.5">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id as NavTab)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-sky-500/10 text-sky-400 border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
                <div className="text-left">
                  <div className="font-medium text-slate-200 leading-tight">{item.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal leading-tight mt-0.5">{item.description}</div>
                </div>
              </div>
              {item.badge && (
                <span className={`px-1.5 py-0.5 text-[10px] font-semibold rounded ${
                  item.badgeColor === 'rose'
                    ? 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                    : 'bg-sky-950/80 text-sky-300 border border-sky-800/60 animate-pulse'
                }`}>
                  {item.badge}
                </span>
              )}
              {item.count !== undefined && item.count > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/60">
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Engine Status Footer */}
      <div className="p-3.5 rounded-xl border border-slate-800/80 bg-slate-900/50 text-xs">
        <div className="flex items-center justify-between text-slate-400 mb-1.5">
          <span className="flex items-center gap-1.5 font-medium text-slate-200">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            Meta Llama 3.3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] text-emerald-400 font-mono">Active</span>
          </span>
        </div>
        <div className="text-[11px] text-slate-500">
          Orchestrator: <span className="text-slate-400">LangGraph v0.2</span>
        </div>
        <div className="text-[11px] text-slate-500 mt-0.5">
          Protection: <span className="text-emerald-400 font-medium">AgentFence Shield</span>
        </div>
      </div>
    </aside>
  );
};

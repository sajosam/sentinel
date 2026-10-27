import React from 'react';
import {
  LayoutDashboard,
  FolderGit2,
  Terminal,
  Bug,
  ScrollText,
  Settings,
  Shield
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
  unresolvedCount?: number;
  blockedCount?: number;
  isInvestigating?: boolean;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'projects', label: 'Projects', icon: FolderGit2 },
    { id: 'investigations', label: 'Investigations', icon: Terminal },
    { id: 'findings', label: 'Findings', icon: Bug },
    { id: 'activity', label: 'Activity', icon: ScrollText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-56 border-r border-slate-200 bg-white flex flex-col justify-between p-3 select-none flex-shrink-0">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 py-3 mb-3 border-b border-slate-100">
          <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center text-white">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-900 tracking-tight">SentinelOS</div>
            <div className="text-[10px] text-slate-500 -mt-0.5">Local AI Security</div>
          </div>
        </div>

        {/* Navigation Items (Only 6 items, no subtitles, no badges) */}
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Model & Agent Status Footer */}
      <div className="px-3 py-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="truncate">Meta Llama 3.3</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-slate-600 font-medium">Ready</span>
        </span>
      </div>
    </aside>
  );
};

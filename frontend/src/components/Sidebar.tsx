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
    <aside className="w-56 border-r border-[#283149] bg-[#141B2D] flex flex-col justify-between p-3 select-none flex-shrink-0">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4 border-b border-[#283149]/60">
          <div className="w-6 h-6 rounded bg-[#8B7CFF] flex items-center justify-center text-white shadow-sm">
            <Shield className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#E8ECF5] tracking-tight">SentinelOS</div>
            <div className="text-[10px] text-[#9AA6BF] -mt-0.5">Autonomous Security</div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id as NavTab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                  isActive
                    ? 'bg-[#1B243B] text-[#E8ECF5] font-semibold border-l-2 border-[#8B7CFF]'
                    : 'text-[#9AA6BF] hover:text-[#E8ECF5] hover:bg-[#1B243B]/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#8B7CFF]' : 'text-[#9AA6BF]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Model Status Footer */}
      <div className="px-3 py-2.5 border-t border-[#283149]/60 text-[11px] text-[#9AA6BF] flex items-center justify-between">
        <span className="truncate">Meta Llama 3.3</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#36D6B0]" />
          <span className="text-[10px] text-[#36D6B0] font-medium">Ready</span>
        </span>
      </div>
    </aside>
  );
};

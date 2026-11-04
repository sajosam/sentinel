import React from 'react';
import {
  LayoutDashboard,
  Terminal,
  Swords,
  Bug,
  Settings,
  Shield
} from 'lucide-react';

export type NavTab =
  | 'overview'
  | 'investigations'
  | 'attacklab'
  | 'findings'
  | 'settings';

interface Props {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  unresolvedCount?: number;
  blockedCount?: number;
  isInvestigating?: boolean;
  modelLabel?: string;
  modelConfigured?: boolean;
}

export const Sidebar: React.FC<Props> = ({
  currentTab,
  onSelectTab,
  modelLabel = 'Offline fallback',
  modelConfigured = false
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'investigations', label: 'Investigations', icon: Terminal },
    { id: 'attacklab', label: 'Attack Lab', icon: Swords },
    { id: 'findings', label: 'Findings', icon: Bug },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-56 border-r border-[#232B38] bg-[#141A24] flex flex-col justify-between p-3 flex-shrink-0">
      <div>
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4 border-b border-[#232B38]/60">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#2F6FE0] flex items-center justify-center text-white shadow-sm ring-1 ring-white/10">
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#E6EBF2] tracking-tight">SentinelOS</div>
            <div className="text-[10px] text-[#8A97AC] -mt-0.5">Autonomous Security</div>
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
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors relative ${
                  isActive
                    ? 'bg-[#3B82F6]/10 text-[#E6EBF2] font-semibold'
                    : 'text-[#8A97AC] hover:text-[#E6EBF2] hover:bg-[#1B222E]/60'
                }`}
              >
                {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-[#3B82F6]" />}
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#3B82F6]' : 'text-[#8A97AC]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Model Status Footer */}
      <div className="px-3 py-2.5 border-t border-[#232B38]/60 text-[11px] text-[#8A97AC] flex items-center justify-between">
        <span className="truncate">{modelLabel}</span>
        <span className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`w-1.5 h-1.5 rounded-full ${modelConfigured ? 'bg-[#10B981]' : 'bg-amber-400'}`} />
          <span className={`text-[10px] font-medium ${modelConfigured ? 'text-[#10B981]' : 'text-amber-300'}`}>
            {modelConfigured ? 'Live' : 'No key'}
          </span>
        </span>
      </div>
    </aside>
  );
};

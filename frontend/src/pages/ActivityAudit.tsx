import React, { useState } from 'react';
import { AuditEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { Search, ScrollText } from 'lucide-react';

interface Props {
  auditEvents: AuditEvent[];
}

export const ActivityAudit: React.FC<Props> = ({ auditEvents }) => {
  const [filterDecision, setFilterDecision] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filtered = auditEvents.filter((evt) => {
    if (filterDecision !== 'ALL' && evt.decision !== filterDecision) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        evt.action.toLowerCase().includes(q) ||
        evt.reason.toLowerCase().includes(q) ||
        evt.event_type.toLowerCase().includes(q) ||
        evt.source.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#283149]">
        <div>
          <h1 className="text-xl font-semibold text-[#E8ECF5] tracking-tight">Activity Log</h1>
          <p className="text-xs text-[#9AA6BF] mt-0.5">
            Append-only record of all investigation cycles, scanner runs, and policy decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#9AA6BF] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#141B2D] border border-[#283149] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[#E8ECF5] placeholder-[#9AA6BF]/60 focus:outline-none focus:border-[#8B7CFF] w-full transition-colors"
            />
          </div>

          {/* Decision Filter */}
          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="bg-[#141B2D] border border-[#283149] rounded-lg px-2.5 py-1.5 text-xs text-[#E8ECF5] focus:outline-none focus:border-[#8B7CFF] transition-colors"
          >
            <option value="ALL">All Decisions</option>
            <option value="DENY">Blocked Actions</option>
            <option value="ALLOW">Allowed Actions</option>
            <option value="REQUIRE_APPROVAL">Needs Approval</option>
          </select>
        </div>
      </div>

      {/* 2. Activity Table */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#9AA6BF] rounded-xl border border-[#283149] bg-[#141B2D]">
          No activity events recorded with the selected filters.
        </div>
      ) : (
        <div className="border border-[#283149] rounded-xl bg-[#141B2D] divide-y divide-[#283149] overflow-hidden shadow-sm">
          {filtered.map((evt) => (
            <div key={evt.id} className="p-4 flex items-start justify-between gap-4 text-xs hover:bg-[#1B243B]/60 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                  <StatusBadge type="decision" value={evt.decision} />
                </div>
                <div className="space-y-1 min-w-0">
                  <div className="font-mono text-[#E8ECF5] text-xs truncate">
                    {evt.action}
                  </div>
                  <p className="text-[#9AA6BF] text-xs leading-relaxed">
                    {evt.reason}
                  </p>
                  <div className="text-[11px] text-[#9AA6BF]/70 font-mono flex items-center gap-2">
                    <span>Source: {evt.source}</span>
                    <span>•</span>
                    <span>Type: {evt.event_type}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0 text-[#9AA6BF] font-mono text-[11px]">
                <div className="text-[#E8ECF5]">{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                <div className="text-[10px] text-[#9AA6BF]">{new Date(evt.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

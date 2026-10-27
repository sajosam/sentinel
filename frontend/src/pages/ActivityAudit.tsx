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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Activity Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Append-only record of all investigation cycles, scanner runs, and policy decisions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search activity..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 w-full"
            />
          </div>

          {/* Decision Filter */}
          <select
            value={filterDecision}
            onChange={(e) => setFilterDecision(e.target.value)}
            className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
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
        <div className="p-12 text-center text-xs text-slate-500 rounded-lg border border-slate-200 bg-white">
          No activity events recorded with the selected filters.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white divide-y divide-slate-100">
          {filtered.map((evt) => (
            <div key={evt.id} className="p-3.5 flex items-start justify-between gap-4 text-xs hover:bg-slate-50/60 transition-colors">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-0.5 flex-shrink-0">
                  <StatusBadge type="decision" value={evt.decision} />
                </div>
                <div className="space-y-0.5 min-w-0">
                  <div className="font-mono text-slate-900 text-xs truncate">
                    {evt.action}
                  </div>
                  <p className="text-slate-600 text-xs leading-snug">
                    {evt.reason}
                  </p>
                  <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                    <span>Source: {evt.source}</span>
                    <span>•</span>
                    <span>Type: {evt.event_type}</span>
                  </div>
                </div>
              </div>

              <div className="text-right flex-shrink-0 text-slate-400 font-mono text-[11px]">
                <div>{new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</div>
                <div className="text-[10px] text-slate-400">{new Date(evt.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

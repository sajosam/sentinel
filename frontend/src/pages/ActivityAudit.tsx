import React, { useState } from 'react';
import { AuditEvent } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { ScrollText, Search, ShieldCheck, Filter } from 'lucide-react';

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
    <div className="space-y-6">
      {/* Header and Filter Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0b101c] flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <ScrollText className="w-5 h-5 text-emerald-400" />
            <span>Immutable Security Audit Log</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Append-only record of all investigation cycles, tool executions, and Policy Engine decisions with automatic secret redaction.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search audit events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
          </div>

          {/* Decision Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Decision:</span>
            <select
              value={filterDecision}
              onChange={(e) => setFilterDecision(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Decisions</option>
              <option value="ALLOW">Allowed</option>
              <option value="DENY">Blocked (Deny)</option>
              <option value="REQUIRE_APPROVAL">Require Approval</option>
            </select>
          </div>
        </div>
      </div>

      {/* Audit Events Table */}
      <div className="rounded-xl border border-slate-800 bg-[#0b101c] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800 tracking-wider">
              <tr>
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Decision</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Justification & Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-sans text-xs">
                    No audit records match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(evt.created_at).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-sans">
                      <StatusBadge type="decision" value={evt.decision} />
                    </td>
                    <td className="py-3 px-4 text-slate-200 font-semibold text-[11px] whitespace-nowrap">
                      {evt.action}
                    </td>
                    <td className="py-3 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {evt.source}
                    </td>
                    <td className="py-3 px-4 text-slate-300 font-sans text-xs max-w-lg leading-relaxed">
                      {evt.reason}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

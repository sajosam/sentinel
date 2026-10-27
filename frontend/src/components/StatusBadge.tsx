import React from 'react';

interface Props {
  type: 'severity' | 'decision' | 'status';
  value: string;
}

export const StatusBadge: React.FC<Props> = ({ type, value }) => {
  const valUpper = (value || '').toUpperCase();

  if (type === 'severity') {
    switch (valUpper) {
      case 'CRITICAL':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-rose-500/10 text-rose-300 border-rose-500/30">
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-blue-500/10 text-blue-300 border-blue-500/30">
            Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-500/10 text-slate-300 border-slate-500/30">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-800 text-slate-300 border-slate-700">
            {value}
          </span>
        );
    }
  }

  if (type === 'decision') {
    switch (valUpper) {
      case 'DENY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border bg-rose-500/10 text-rose-300 border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            Blocked
          </span>
        );
      case 'ALLOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border bg-[#36D6B0]/10 text-[#36D6B0] border-[#36D6B0]/30">
            <span className="w-1.5 h-1.5 rounded-full bg-[#36D6B0]" />
            Allowed
          </span>
        );
      case 'REQUIRE_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border bg-amber-500/10 text-amber-300 border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Approval Needed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-800 text-slate-300 border-slate-700">
            {value}
          </span>
        );
    }
  }

  if (type === 'status') {
    switch (valUpper) {
      case 'VERIFIED_FIXED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border bg-[#36D6B0]/10 text-[#36D6B0] border-[#36D6B0]/30">
            Verified Fixed
          </span>
        );
      case 'FIX_PROPOSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-[#8B7CFF]/10 text-[#8B7CFF] border-[#8B7CFF]/30">
            Fix Proposed
          </span>
        );
      case 'UNRESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-rose-500/10 text-rose-300 border-rose-500/30">
            Unresolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-[#283149]/50 text-[#9AA6BF] border-[#283149]">
            Open
          </span>
        );
    }
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-[#283149]/50 text-[#9AA6BF] border-[#283149]">
      {value}
    </span>
  );
};

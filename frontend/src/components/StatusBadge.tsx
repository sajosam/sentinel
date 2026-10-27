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
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-rose-50 text-rose-700 border-rose-200">
            Critical
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-amber-50 text-amber-800 border-amber-200">
            High
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-100 text-slate-700 border-slate-200">
            Medium
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-50 text-slate-600 border-slate-200">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-50 text-slate-600 border-slate-200">
            {value}
          </span>
        );
    }
  }

  if (type === 'decision') {
    switch (valUpper) {
      case 'DENY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border bg-rose-50 text-rose-700 border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Blocked
          </span>
        );
      case 'ALLOW':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Allowed
          </span>
        );
      case 'REQUIRE_APPROVAL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-medium rounded border bg-amber-50 text-amber-800 border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Approval Needed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-50 text-slate-600 border-slate-200">
            {value}
          </span>
        );
    }
  }

  if (type === 'status') {
    switch (valUpper) {
      case 'VERIFIED_FIXED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
            Verified Fixed
          </span>
        );
      case 'FIX_PROPOSED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-sky-50 text-sky-700 border-sky-200">
            Fix Proposed
          </span>
        );
      case 'UNRESOLVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-rose-50 text-rose-700 border-rose-200">
            Unresolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-50 text-slate-600 border-slate-200">
            Open
          </span>
        );
    }
  }

  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded border bg-slate-50 text-slate-600 border-slate-200">
      {value}
    </span>
  );
};

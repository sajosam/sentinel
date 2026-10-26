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
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-950/80 text-rose-400 border border-rose-800/60">CRITICAL</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-orange-950/80 text-orange-400 border border-orange-800/60">HIGH</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-amber-950/80 text-amber-400 border border-amber-800/60">MEDIUM</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">LOW</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">INFO</span>;
    }
  }

  if (type === 'decision') {
    switch (valUpper) {
      case 'DENY':
        return <span className="px-2.5 py-1 text-xs font-bold rounded bg-rose-950/90 text-rose-400 border border-rose-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>BLOCKED</span>;
      case 'ALLOW':
        return <span className="px-2.5 py-1 text-xs font-bold rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>ALLOWED</span>;
      case 'REQUIRE_APPROVAL':
        return <span className="px-2.5 py-1 text-xs font-bold rounded bg-amber-950/80 text-amber-400 border border-amber-700 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>APPROVAL NEEDED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800 text-slate-300">{value}</span>;
    }
  }

  if (type === 'status') {
    switch (valUpper) {
      case 'VERIFIED_FIXED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-950 text-emerald-300 border border-emerald-700">VERIFIED FIXED</span>;
      case 'FIX_PROPOSED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-sky-950 text-sky-300 border border-sky-700">PATCH PROPOSED</span>;
      case 'UNRESOLVED':
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-rose-950 text-rose-400 border border-rose-800">UNRESOLVED</span>;
      default:
        return <span className="px-2 py-0.5 text-xs font-semibold rounded bg-slate-800 text-slate-400 border border-slate-700">UNVERIFIED</span>;
    }
  }

  return <span className="px-2 py-0.5 text-xs rounded bg-slate-800 text-slate-300">{value}</span>;
};

import React from 'react';

interface Props {
  diff: string;
}

export const DiffViewer: React.FC<Props> = ({ diff }) => {
  if (!diff) {
    return (
      <div className="p-4 text-xs text-slate-500 font-mono bg-slate-50 border border-slate-200 rounded-lg">
        No patch diff generated yet.
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <div className="rounded-lg border border-slate-200 bg-white overflow-hidden text-xs font-mono">
      <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 text-[11px] text-slate-500 font-medium flex items-center justify-between">
        <span>Unified Patch Diff</span>
        <span>{lines.length} lines</span>
      </div>
      <div className="p-2 overflow-x-auto max-h-[380px] overflow-y-auto">
        {lines.map((line, idx) => {
          let lineStyle = 'text-slate-700';
          let bgStyle = '';
          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineStyle = 'text-emerald-800 font-medium';
            bgStyle = 'bg-emerald-50/80 -mx-2 px-2';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineStyle = 'text-rose-800 font-medium';
            bgStyle = 'bg-rose-50/80 -mx-2 px-2';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-slate-500 font-semibold';
            bgStyle = 'bg-slate-100 -mx-2 px-2 border-y border-slate-200/80 my-1 py-0.5 text-[11px]';
          }

          return (
            <div key={idx} className={`leading-5 whitespace-pre flex items-center ${bgStyle}`}>
              <span className="w-8 select-none text-slate-400 text-right pr-3 flex-shrink-0 text-[10px]">
                {idx + 1}
              </span>
              <span className={`${lineStyle} flex-1`}>{line}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

import React from 'react';

interface Props {
  diff: string;
}

export const DiffViewer: React.FC<Props> = ({ diff }) => {
  if (!diff) {
    return <div className="p-4 text-xs text-slate-500 font-mono">No patch diff generated yet.</div>;
  }

  const lines = diff.split('\n');

  return (
    <div className="rounded-lg border border-slate-800 bg-[#070b12] p-3 font-mono text-xs overflow-x-auto">
      {lines.map((line, idx) => {
        let lineStyle = 'text-slate-400';
        let bgStyle = '';
        if (line.startsWith('+') && !line.startsWith('+++')) {
          lineStyle = 'text-emerald-400 font-semibold';
          bgStyle = 'bg-emerald-950/40 -mx-3 px-3';
        } else if (line.startsWith('-') && !line.startsWith('---')) {
          lineStyle = 'text-rose-400 line-through';
          bgStyle = 'bg-rose-950/40 -mx-3 px-3';
        } else if (line.startsWith('@@')) {
          lineStyle = 'text-sky-400 font-bold';
          bgStyle = 'bg-sky-950/30 -mx-3 px-3 border-y border-sky-900/40 my-1';
        }

        return (
          <div key={idx} className={`leading-5 whitespace-pre ${lineStyle} ${bgStyle}`}>
            <span className="inline-block w-8 select-none text-slate-600 text-right pr-3">{idx + 1}</span>
            {line}
          </div>
        );
      })}
    </div>
  );
};

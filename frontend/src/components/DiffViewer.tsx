import React from 'react';

interface Props {
  diff: string;
}

export const DiffViewer: React.FC<Props> = ({ diff }) => {
  if (!diff) {
    return (
      <div className="p-4 text-xs text-[#9AA6BF] font-mono bg-[#141B2D] border border-[#283149] rounded-lg">
        No patch diff generated yet.
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <div className="rounded-lg border border-[#283149] bg-[#141B2D] overflow-hidden text-xs font-mono">
      <div className="bg-[#0F1526] border-b border-[#283149] px-3.5 py-2 text-[11px] text-[#9AA6BF] font-medium flex items-center justify-between">
        <span className="font-semibold text-[#E8ECF5]">Unified Patch Diff</span>
        <span>{lines.length} lines</span>
      </div>
      <div className="p-2.5 overflow-x-auto max-h-[380px] overflow-y-auto bg-[#0B1020]">
        {lines.map((line, idx) => {
          let lineStyle = 'text-[#C5CEE0]';
          let bgStyle = '';
          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineStyle = 'text-[#36D6B0] font-medium';
            bgStyle = 'bg-[#36D6B0]/10 -mx-2 px-2';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineStyle = 'text-rose-400 font-medium';
            bgStyle = 'bg-rose-500/10 -mx-2 px-2';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-[#8B7CFF] font-semibold';
            bgStyle = 'bg-[#1B243B] -mx-2 px-2 border-y border-[#283149] my-1 py-0.5 text-[11px]';
          }

          return (
            <div key={idx} className={`leading-5 whitespace-pre flex items-center ${bgStyle}`}>
              <span className="w-8 select-none text-[#586580] text-right pr-3 flex-shrink-0 text-[10px]">
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

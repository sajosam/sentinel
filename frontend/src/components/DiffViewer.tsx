import React from 'react';

interface Props {
  diff: string;
}

export const DiffViewer: React.FC<Props> = ({ diff }) => {
  if (!diff) {
    return (
      <div className="p-4 text-xs text-[#8A97AC] font-mono bg-[#141A24] border border-[#232B38] rounded-lg">
        No patch diff generated yet.
      </div>
    );
  }

  const lines = diff.split('\n');

  return (
    <div className="rounded-lg border border-[#232B38] bg-[#141A24] overflow-hidden text-xs font-mono">
      <div className="bg-[#10151D] border-b border-[#232B38] px-3.5 py-2 text-[11px] text-[#8A97AC] font-medium flex items-center justify-between">
        <span className="font-semibold text-[#E6EBF2]">Unified Patch Diff</span>
        <span>{lines.length} lines</span>
      </div>
      <div className="p-2.5 overflow-x-auto max-h-[380px] overflow-y-auto bg-[#0A0E14]">
        {lines.map((line, idx) => {
          let lineStyle = 'text-[#CBD5E6]';
          let bgStyle = '';
          if (line.startsWith('+') && !line.startsWith('+++')) {
            lineStyle = 'text-[#10B981] font-medium';
            bgStyle = 'bg-[#10B981]/10 -mx-2 px-2';
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            lineStyle = 'text-rose-400 font-medium';
            bgStyle = 'bg-rose-500/10 -mx-2 px-2';
          } else if (line.startsWith('@@')) {
            lineStyle = 'text-[#3B82F6] font-semibold';
            bgStyle = 'bg-[#1B222E] -mx-2 px-2 border-y border-[#232B38] my-1 py-0.5 text-[11px]';
          }

          return (
            <div key={idx} className={`leading-5 whitespace-pre flex items-center ${bgStyle}`}>
              <span className="w-8 select-none text-[#55627A] text-right pr-3 flex-shrink-0 text-[10px]">
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

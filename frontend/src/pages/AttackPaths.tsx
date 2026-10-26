import React, { useState } from 'react';
import { AttackPath } from '../types';
import { GraphViewer } from '../components/GraphViewer';
import { Network, AlertTriangle, ShieldCheck, Sparkles } from 'lucide-react';

interface Props {
  attackPaths: AttackPath[];
  onStartAudit: () => void;
}

export const AttackPaths: React.FC<Props> = ({ attackPaths, onStartAudit }) => {
  const [selectedPathIndex, setSelectedPathIndex] = useState<number>(0);

  if (attackPaths.length === 0) {
    return (
      <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl glass-panel space-y-4">
        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mx-auto">
          <Network className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-slate-200">No Attack Paths Modeled Yet</h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          ThreatLens models multi-step attack graphs by analyzing relationships between endpoints, exposed secrets, databases, and detected vulnerabilities.
        </p>
        <button
          onClick={onStartAudit}
          className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold inline-flex items-center gap-2 shadow-lg shadow-purple-500/10 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 fill-current" />
          <span>Generate ThreatLens Attack Graph</span>
        </button>
      </div>
    );
  }

  const currentPath = attackPaths[selectedPathIndex] || attackPaths[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-5 h-5 text-purple-400" />
            <span>ThreatLens Exploit & Attack Path Modeling</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Graph representation of interconnected project components, vulnerabilities, and inferred reachability.
          </p>
        </div>

        {attackPaths.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Vector:</span>
            <select
              value={selectedPathIndex}
              onChange={(e) => setSelectedPathIndex(Number(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
            >
              {attackPaths.map((p, idx) => (
                <option key={p.id} value={idx}>
                  {p.name} (Risk: {p.risk_score.toFixed(1)})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Graph Visualizer Canvas */}
      <GraphViewer attackPath={currentPath} />
    </div>
  );
};

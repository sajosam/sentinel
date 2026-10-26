import React, { useState } from 'react';
import { AttackPath, AttackPathNode, AttackPathEdge } from '../types';
import { ArrowRight, Database, FileCode, Key, Layers, Globe, AlertTriangle } from 'lucide-react';

interface Props {
  attackPath: AttackPath;
}

export const GraphViewer: React.FC<Props> = ({ attackPath }) => {
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<AttackPathEdge | null>(null);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'api_endpoint':
        return <Globe className="w-4 h-4 text-sky-400" />;
      case 'source_file':
        return <FileCode className="w-4 h-4 text-emerald-400" />;
      case 'secret':
        return <Key className="w-4 h-4 text-amber-400" />;
      case 'database':
        return <Database className="w-4 h-4 text-purple-400" />;
      case 'dependency':
        return <Layers className="w-4 h-4 text-blue-400" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Narrative & Score Banner */}
      <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">{attackPath.name}</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">{attackPath.description}</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider text-slate-500 font-medium">Risk Score</div>
          <div className="text-2xl font-bold text-rose-400">{attackPath.risk_score.toFixed(1)} <span className="text-xs text-slate-500">/ 10</span></div>
        </div>
      </div>

      {/* Visual Chain Progression */}
      <div className="p-6 rounded-xl border border-slate-800 bg-[#080d17] overflow-x-auto">
        <div className="flex items-center gap-3 min-w-max py-4">
          {attackPath.nodes.map((node, index) => {
            const edge = attackPath.edges.find(e => e.source_node_id === node.id || e.source_node_id === `node_${index + 1}`);

            return (
              <React.Fragment key={node.id}>
                {/* Node Box */}
                <div
                  onClick={() => { setSelectedNode(node); setSelectedEdge(null); }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col items-center gap-2 min-w-[140px] text-center ${
                    selectedNode?.id === node.id
                      ? 'border-sky-500 bg-sky-950/40 glow-blue'
                      : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    {getNodeIcon(node.node_type)}
                  </div>
                  <span className="text-xs font-semibold text-slate-200">{node.label}</span>
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/50">
                    {node.node_type}
                  </span>
                </div>

                {/* Connecting Edge / Arrow */}
                {index < attackPath.nodes.length - 1 && (
                  <div
                    onClick={() => { setSelectedEdge(edge || null); setSelectedNode(null); }}
                    className="flex flex-col items-center px-1 cursor-pointer group"
                  >
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded mb-1 border ${
                      edge?.is_inferred
                        ? 'bg-amber-950/50 text-amber-300 border-amber-800/50 border-dashed'
                        : 'bg-slate-800 text-slate-300 border-slate-700'
                    }`}>
                      {edge ? edge.relation_type : 'reaches'}
                      {edge?.is_inferred && ' (inferred)'}
                    </span>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-sky-400 transition-colors" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Detail Inspector Drawer */}
      {(selectedNode || selectedEdge) && (
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 animate-fadeIn">
          {selectedNode && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-sky-400 tracking-wider">
                {getNodeIcon(selectedNode.node_type)}
                <span>Node Inspector: {selectedNode.label}</span>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                Type: <strong className="text-slate-100 font-mono">{selectedNode.node_type}</strong>
              </p>
              <div className="mt-2 text-xs text-slate-400 bg-slate-950 p-2.5 rounded border border-slate-800 font-mono">
                Asset mapped by ThreatLens graph engine during codebase structural discovery.
              </div>
            </div>
          )}
          {selectedEdge && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-400 tracking-wider">
                <ArrowRight className="w-4 h-4" />
                <span>Relationship Inspector: {selectedEdge.relation_type}</span>
              </div>
              <p className="mt-2 text-xs text-slate-300">
                Classification: <strong className={selectedEdge.is_inferred ? 'text-amber-400' : 'text-emerald-400'}>
                  {selectedEdge.is_inferred ? 'Inferred Architectural Relationship' : 'Confirmed Code Evidence'}
                </strong>
              </p>
              {selectedEdge.evidence_reference && (
                <div className="mt-2 text-xs text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
                  <span className="text-slate-500 font-mono block text-[10px] uppercase mb-1">Supporting Evidence:</span>
                  {selectedEdge.evidence_reference}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

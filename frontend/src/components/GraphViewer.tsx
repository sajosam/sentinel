import React, { useState } from 'react';
import { AttackPath, AttackPathNode, AttackPathEdge } from '../types';
import { ArrowRight, Database, FileCode, Key, Layers, Globe, AlertTriangle } from 'lucide-react';

interface Props {
  attackPath: AttackPath;
}

export const GraphViewer: React.FC<Props> = ({ attackPath }) => {
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(attackPath.nodes[0] || null);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'api_endpoint':
        return <Globe className="w-4 h-4 text-[#3B82F6]" />;
      case 'source_file':
        return <FileCode className="w-4 h-4 text-[#10B981]" />;
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

  const labelFor = (nodeId: string): string =>
    attackPath.nodes.find((n) => n.id === nodeId)?.label || 'node';
  const edges: AttackPathEdge[] = attackPath.edges || [];

  return (
    <div className="space-y-4">
      {/* Narrative & Score Bar */}
      <div className="p-4 rounded-lg border border-[#232B38] bg-[#141A24] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#E6EBF2]">{attackPath.name}</h3>
          <p className="text-xs text-[#8A97AC] mt-0.5 max-w-2xl">{attackPath.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#8A97AC] font-medium">Risk Score:</span>
          <span className="text-base font-bold text-[#E6EBF2]">
            {attackPath.risk_score.toFixed(1)} <span className="text-xs font-normal text-[#8A97AC]">/ 10</span>
          </span>
        </div>
      </div>

      {/* Viewport-fitting Graph Progression (Responsive flow, no horizontal overflow) */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-[#8A97AC]">Attack Chain Progression</div>
        <div className="p-4 rounded-lg border border-[#232B38] bg-[#141A24]">
          <div className="flex flex-wrap items-center gap-2">
            {attackPath.nodes.map((node, index) => {
              const isSelected = selectedNode?.id === node.id;
              const isLast = index === attackPath.nodes.length - 1;

              return (
                <React.Fragment key={node.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedNode(node)}
                    className={`p-3 rounded-lg border text-left transition-all flex items-center gap-2.5 ${
                      isSelected
                        ? 'border-[#3B82F6] bg-[#3B82F6]/10'
                        : 'border-[#232B38] bg-[#0A0E14] hover:border-[#2E394B]'
                    }`}
                  >
                    <div className="p-1.5 rounded bg-[#141A24] border border-[#232B38] flex-shrink-0">
                      {getNodeIcon(node.node_type)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#E6EBF2] leading-tight truncate max-w-[150px]">
                        {node.label}
                      </div>
                      <div className="text-[10px] text-[#8A97AC] capitalize leading-tight mt-0.5">
                        {node.node_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </button>

                  {!isLast && (
                    <ArrowRight className="w-4 h-4 text-[#8A97AC] flex-shrink-0" />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Node Detail + Linear Path Narrative */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Selected Component Details */}
        <div className="p-4 rounded-lg border border-[#232B38] bg-[#141A24] space-y-3">
          <div className="text-xs font-semibold text-[#E6EBF2] flex items-center justify-between pb-2 border-b border-[#232B38]">
            <span>Selected Component Details</span>
            {selectedNode && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#0A0E14] border border-[#232B38] text-[#8A97AC]">
                {selectedNode.node_type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#8A97AC] text-[11px] block">Component Name</span>
                <span className="font-semibold text-[#E6EBF2]">{selectedNode.label}</span>
              </div>
              <div>
                <span className="text-[#8A97AC] text-[11px] block">Details & References</span>
                <div className="p-2.5 rounded bg-[#0A0E14] border border-[#232B38] font-mono text-[11px] text-[#CBD5E6]">
                  {selectedNode.details && Object.keys(selectedNode.details).length > 0 ? (
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(selectedNode.details, null, 2)}
                    </pre>
                  ) : (
                    <span>Confirmed active in workspace environment.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-[#8A97AC]">Select a node above to inspect its details.</p>
          )}
        </div>

        {/* Edge list: what links each step, and whether it is evidence or inference */}
        <div className="p-4 rounded-lg border border-[#232B38] bg-[#141A24] space-y-3">
          <div className="text-xs font-semibold text-[#E6EBF2] pb-2 border-b border-[#232B38]">
            How the chain connects
          </div>
          {edges.length === 0 ? (
            <p className="text-xs text-[#8A97AC]">No relationships recorded for this path.</p>
          ) : (
            <div className="space-y-2.5 text-xs">
              {edges.map((e) => (
                <div key={e.id} className="flex items-start gap-2.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex-shrink-0 mt-0.5 ${
                      e.is_inferred
                        ? 'border-dashed border-amber-500/40 text-amber-300 bg-amber-500/10'
                        : 'border-[#10B981]/30 text-[#10B981] bg-[#10B981]/10'
                    }`}
                  >
                    {e.is_inferred ? 'INFERRED' : 'CONFIRMED'}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium text-[#E6EBF2] break-words">
                      {labelFor(e.source_node_id)}{' '}
                      <span className="font-mono text-[#3B82F6] text-[11px]">{e.relation_type.replace(/_/g, ' ')}</span>{' '}
                      {labelFor(e.target_node_id)}
                    </div>
                    {e.evidence_reference && (
                      <p className="text-[11px] text-[#8A97AC] mt-0.5 leading-snug">{e.evidence_reference}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

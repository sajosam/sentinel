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
        return <Globe className="w-4 h-4 text-[#8B7CFF]" />;
      case 'source_file':
        return <FileCode className="w-4 h-4 text-[#36D6B0]" />;
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

  const getLinearSteps = () => {
    return [
      {
        step: 1,
        title: 'Untrusted Entry Point',
        desc: 'Attacker provides unvalidated input via query parameters or API payloads.',
        target: attackPath.nodes.find(n => n.node_type === 'api_endpoint')?.label || 'HTTP Endpoint'
      },
      {
        step: 2,
        title: 'Vulnerable Execution Path',
        desc: 'Application code processes input directly into database queries without parameterization.',
        target: attackPath.nodes.find(n => n.node_type === 'source_file')?.label || 'Application Handler'
      },
      {
        step: 3,
        title: 'Asset Impact',
        desc: 'Database records, system credentials, or backend services are compromised.',
        target: attackPath.nodes.find(n => n.node_type === 'database' || n.node_type === 'secret')?.label || 'Protected Data'
      }
    ];
  };

  return (
    <div className="space-y-4">
      {/* Narrative & Score Bar */}
      <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-[#E8ECF5]">{attackPath.name}</h3>
          <p className="text-xs text-[#9AA6BF] mt-0.5 max-w-2xl">{attackPath.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-[#9AA6BF] font-medium">Risk Score:</span>
          <span className="text-base font-bold text-[#E8ECF5]">
            {attackPath.risk_score.toFixed(1)} <span className="text-xs font-normal text-[#9AA6BF]">/ 10</span>
          </span>
        </div>
      </div>

      {/* Viewport-fitting Graph Progression (Responsive flow, no horizontal overflow) */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-[#9AA6BF]">Attack Chain Progression</div>
        <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D]">
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
                        ? 'border-[#8B7CFF] bg-[#8B7CFF]/10'
                        : 'border-[#283149] bg-[#0B1020] hover:border-[#3A4565]'
                    }`}
                  >
                    <div className="p-1.5 rounded bg-[#141B2D] border border-[#283149] flex-shrink-0">
                      {getNodeIcon(node.node_type)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-[#E8ECF5] leading-tight truncate max-w-[150px]">
                        {node.label}
                      </div>
                      <div className="text-[10px] text-[#9AA6BF] capitalize leading-tight mt-0.5">
                        {node.node_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </button>

                  {!isLast && (
                    <ArrowRight className="w-4 h-4 text-[#9AA6BF] flex-shrink-0" />
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
        <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] space-y-3">
          <div className="text-xs font-semibold text-[#E8ECF5] flex items-center justify-between pb-2 border-b border-[#283149]">
            <span>Selected Component Details</span>
            {selectedNode && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#0B1020] border border-[#283149] text-[#9AA6BF]">
                {selectedNode.node_type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-[#9AA6BF] text-[11px] block">Component Name</span>
                <span className="font-semibold text-[#E8ECF5]">{selectedNode.label}</span>
              </div>
              <div>
                <span className="text-[#9AA6BF] text-[11px] block">Details & References</span>
                <div className="p-2.5 rounded bg-[#0B1020] border border-[#283149] font-mono text-[11px] text-[#C5CEE0]">
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
            <p className="text-xs text-[#9AA6BF]">Select a node above to inspect its details.</p>
          )}
        </div>

        {/* Linear Path Explanation */}
        <div className="p-4 rounded-lg border border-[#283149] bg-[#141B2D] space-y-3">
          <div className="text-xs font-semibold text-[#E8ECF5] pb-2 border-b border-[#283149]">
            Step-by-Step Exploit Explanation
          </div>
          <div className="space-y-2.5 text-xs">
            {getLinearSteps().map((s) => (
              <div key={s.step} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#1B243B] border border-[#283149] text-[#8B7CFF] font-semibold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.step}
                </span>
                <div>
                  <div className="font-medium text-[#E8ECF5]">
                    {s.title}: <span className="font-mono text-[#9AA6BF] text-[11px]">{s.target}</span>
                  </div>
                  <p className="text-[11px] text-[#9AA6BF] mt-0.5 leading-snug">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

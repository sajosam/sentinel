import React, { useState } from 'react';
import { AttackPath, AttackPathNode, AttackPathEdge } from '../types';
import { ArrowRight, Database, FileCode, Key, Layers, Globe, AlertTriangle, ShieldCheck } from 'lucide-react';

interface Props {
  attackPath: AttackPath;
}

export const GraphViewer: React.FC<Props> = ({ attackPath }) => {
  const [selectedNode, setSelectedNode] = useState<AttackPathNode | null>(attackPath.nodes[0] || null);

  const getNodeIcon = (type: string) => {
    switch (type) {
      case 'api_endpoint':
        return <Globe className="w-4 h-4 text-sky-600" />;
      case 'source_file':
        return <FileCode className="w-4 h-4 text-emerald-600" />;
      case 'secret':
        return <Key className="w-4 h-4 text-amber-600" />;
      case 'database':
        return <Database className="w-4 h-4 text-purple-600" />;
      case 'dependency':
        return <Layers className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
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
        desc: 'Application code processes input directly into database queries or commands without sanitization.',
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
    <div className="space-y-6">
      {/* Narrative & Score Bar */}
      <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">{attackPath.name}</h3>
          <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">{attackPath.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-slate-500 font-medium">Risk Score:</span>
          <span className="text-base font-bold text-slate-900">
            {attackPath.risk_score.toFixed(1)} <span className="text-xs font-normal text-slate-500">/ 10</span>
          </span>
        </div>
      </div>

      {/* Viewport-fitting Graph Progression (Wraps cleanly, no horizontal overflow) */}
      <div className="space-y-2">
        <div className="text-xs font-medium text-slate-500">Attack Chain Progression</div>
        <div className="p-4 rounded-lg border border-slate-200 bg-white">
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
                        ? 'border-slate-900 bg-slate-50 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-1.5 rounded bg-slate-100 flex-shrink-0">
                      {getNodeIcon(node.node_type)}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-slate-900 leading-tight truncate max-w-[150px]">
                        {node.label}
                      </div>
                      <div className="text-[10px] text-slate-500 capitalize leading-tight mt-0.5">
                        {node.node_type.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </button>

                  {!isLast && (
                    <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
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
        <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
          <div className="text-xs font-semibold text-slate-900 flex items-center justify-between pb-2 border-b border-slate-100">
            <span>Selected Component Details</span>
            {selectedNode && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                {selectedNode.node_type}
              </span>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500 text-[11px] block">Component Name</span>
                <span className="font-semibold text-slate-900">{selectedNode.label}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[11px] block">Details & References</span>
                <div className="p-2.5 rounded bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-700">
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
            <p className="text-xs text-slate-500">Select a node above to inspect its details.</p>
          )}
        </div>

        {/* Linear Path Explanation */}
        <div className="p-4 rounded-lg border border-slate-200 bg-white space-y-3">
          <div className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-100">
            Step-by-Step Exploit Explanation
          </div>
          <div className="space-y-2.5 text-xs">
            {getLinearSteps().map((s) => (
              <div key={s.step} className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-[10px] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {s.step}
                </span>
                <div>
                  <div className="font-medium text-slate-900">{s.title}: <span className="font-mono text-slate-600 text-[11px]">{s.target}</span></div>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

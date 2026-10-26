import React, { useState } from 'react';
import { Finding } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Bug,
  Filter,
  FileCode,
  Shield,
  Wrench,
  Sparkles,
  ExternalLink,
  Search,
  CheckCircle2
} from 'lucide-react';

interface Props {
  findings: Finding[];
  onSelectFindingForFix: (finding: Finding) => void;
}

export const Findings: React.FC<Props> = ({ findings, onSelectFindingForFix }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFinding, setSelectedFinding] = useState<Finding | null>(findings[0] || null);

  const filteredFindings = findings.filter((f) => {
    if (selectedSeverity !== 'ALL' && f.severity !== selectedSeverity) return false;
    if (selectedCategory !== 'ALL' && f.category !== selectedCategory) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return (
        f.title.toLowerCase().includes(q) ||
        f.description.toLowerCase().includes(q) ||
        (f.file_path || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Filters Toolbar */}
      <div className="p-4 rounded-xl border border-slate-800 bg-[#0b101c] flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative min-w-[260px] flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search findings, files, or rules..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
          />
        </div>

        {/* Severity & Category Dropdowns */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Severity:</span>
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Severities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="ALL">All Categories</option>
              <option value="secret">Secret Exposure</option>
              <option value="sast">Static Code Analysis</option>
              <option value="dependency">Supply Chain Vulnerability</option>
              <option value="prompt_injection">Prompt Shield (AI Defense)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Split: Findings Table (Left) + Detail Inspector (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Findings List (5 cols) */}
        <div className="lg:col-span-5 p-4 rounded-xl border border-slate-800 bg-[#0b101c] space-y-2.5 max-h-[640px] overflow-y-auto">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            <span>Findings ({filteredFindings.length})</span>
          </div>

          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No matching findings found with current filters.
            </div>
          ) : (
            filteredFindings.map((finding) => {
              const isSelected = selectedFinding?.id === finding.id;
              return (
                <div
                  key={finding.id}
                  onClick={() => setSelectedFinding(finding)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-sky-500 bg-sky-950/30'
                      : 'border-slate-800/80 bg-slate-900/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <StatusBadge type="severity" value={finding.severity} />
                    <span className="text-[10px] font-mono text-slate-500 capitalize">{finding.category}</span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-200 leading-snug">{finding.title}</h4>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span className="truncate max-w-[200px]">{finding.file_path || 'project-wide'} {finding.line_number && `:${finding.line_number}`}</span>
                    <StatusBadge type="status" value={finding.verification_status} />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Finding Detail (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-xl border border-slate-800 bg-[#0b101c] flex flex-col justify-between space-y-6">
          {selectedFinding ? (
            <div className="space-y-5">
              {/* Finding Header */}
              <div className="pb-4 border-b border-slate-800 flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <StatusBadge type="severity" value={selectedFinding.severity} />
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Confidence: {selectedFinding.confidence}
                    </span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      Rule: {selectedFinding.rule_id || 'custom-audit'}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-100">{selectedFinding.title}</h3>
                  <div className="mt-1 text-xs text-slate-400 font-mono flex items-center gap-1.5">
                    <FileCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>{selectedFinding.file_path || 'Global Project Scope'}</span>
                    {selectedFinding.line_number && <span>(Line {selectedFinding.line_number})</span>}
                  </div>
                </div>

                {/* Propose Fix Button */}
                <button
                  onClick={() => onSelectFindingForFix(selectedFinding)}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-md glow-blue transition-all"
                >
                  <Wrench className="w-3.5 h-3.5 fill-current" />
                  <span>Propose Fix</span>
                </button>
              </div>

              {/* Problem Description */}
              <div>
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-1">Risk Analysis</span>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  {selectedFinding.description}
                </p>
              </div>

              {/* Impact */}
              {selectedFinding.impact && (
                <div>
                  <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider block mb-1">Potential Impact</span>
                  <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/20 p-3 rounded-xl border border-rose-900/30">
                    {selectedFinding.impact}
                  </p>
                </div>
              )}

              {/* Remediation Guidance */}
              <div>
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Recommended Safe Remediation
                </span>
                <p className="text-xs text-slate-300 leading-relaxed bg-emerald-950/20 p-3 rounded-xl border border-emerald-900/30">
                  {selectedFinding.remediation}
                </p>
              </div>

              {/* Concrete Code Evidence */}
              <div>
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Extracted Code Evidence Snippet
                </span>
                <div className="p-3 rounded-xl border border-slate-800 bg-[#070b12] font-mono text-xs text-slate-200 overflow-x-auto">
                  {selectedFinding.evidence_items && selectedFinding.evidence_items.length > 0 ? (
                    <pre className="text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedFinding.evidence_items[0].content}
                    </pre>
                  ) : (
                    <span className="text-slate-500 italic">Static scanner matched rule {selectedFinding.rule_id} in {selectedFinding.file_path}.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-slate-500">
              Select a finding from the list on the left to review risk evidence, severity justification, and generate automated patches.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

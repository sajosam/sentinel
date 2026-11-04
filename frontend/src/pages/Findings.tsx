import React, { useState } from 'react';
import { Finding } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import {
  Search,
  Filter,
  FileCode,
  CheckCircle2,
  Wrench,
  X,
  ExternalLink
} from 'lucide-react';

interface Props {
  findings: Finding[];
  onSelectFindingForFix: (finding: Finding) => void;
}

export const Findings: React.FC<Props> = ({ findings, onSelectFindingForFix }) => {
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [activeModalFinding, setActiveModalFinding] = useState<Finding | null>(null);

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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* 1. Header & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#232B38]">
        <div>
          <h1 className="text-xl font-semibold text-[#E6EBF2] tracking-tight">Security Findings</h1>
          <p className="text-xs text-[#8A97AC] mt-0.5">
            Security vulnerabilities, exposed credentials, and supply chain risks discovered in your workspace.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-[#8A97AC] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-[#141A24] border border-[#232B38] rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-[#E6EBF2] placeholder-[#8A97AC]/60 focus:outline-none focus:border-[#3B82F6] w-full transition-colors"
            />
          </div>

          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-[#141A24] border border-[#232B38] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EBF2] focus:outline-none focus:border-[#3B82F6] transition-colors"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Category */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#141A24] border border-[#232B38] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EBF2] focus:outline-none focus:border-[#3B82F6] transition-colors"
          >
            <option value="ALL">All Categories</option>
            <option value="secret">Secrets</option>
            <option value="sast">Static Code</option>
            <option value="dependency">Dependencies</option>
            <option value="prompt_injection">AI Prompts</option>
          </select>
        </div>
      </div>

      {/* 2. Clean Findings Table */}
      {filteredFindings.length === 0 ? (
        <div className="p-12 text-center text-xs text-[#8A97AC] rounded-xl border border-[#232B38] bg-[#141A24] shadow-card">
          No findings match the selected filters.
        </div>
      ) : (
        <div className="border border-[#232B38] rounded-xl bg-[#141A24] overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1B222E] border-b border-[#232B38] text-[#8A97AC] font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Severity</th>
                <th className="py-2.5 px-4 font-medium">Finding</th>
                <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Affected File</th>
                <th className="py-2.5 px-4 font-medium hidden md:table-cell">Category</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#232B38]">
              {filteredFindings.map((finding) => (
                <tr
                  key={finding.id}
                  onClick={() => setActiveModalFinding(finding)}
                  className="hover:bg-[#1B222E]/60 transition-colors cursor-pointer"
                >
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge type="severity" value={finding.severity} />
                  </td>
                  <td className="py-3 px-4 font-medium text-[#E6EBF2]">
                    <div>{finding.title}</div>
                    <div className="text-[11px] text-[#8A97AC] font-mono sm:hidden truncate max-w-xs mt-0.5">
                      {finding.file_path}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[#8A97AC] font-mono text-[11px] hidden sm:table-cell truncate max-w-xs">
                    {finding.file_path || 'project-scope'} {finding.line_number && `:${finding.line_number}`}
                  </td>
                  <td className="py-3 px-4 text-[#8A97AC] capitalize hidden md:table-cell whitespace-nowrap">
                    {finding.category.replace(/_/g, ' ')}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <StatusBadge type="status" value={finding.verification_status} />
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalFinding(finding);
                      }}
                      className="text-xs text-[#8A97AC] hover:text-[#E6EBF2] font-medium transition-colors mr-3"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFindingForFix(finding);
                      }}
                      className="text-xs font-semibold text-[#3B82F6] hover:text-white transition-colors"
                    >
                      Fix
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 3. Readable Finding Details Modal */}
      {activeModalFinding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-[#141A24] border border-[#232B38] rounded-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-[#232B38]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge type="severity" value={activeModalFinding.severity} />
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#1B222E] text-[#8A97AC] border border-[#232B38]">
                    Rule: {activeModalFinding.rule_id || 'audit-check'}
                  </span>
                  <StatusBadge type="status" value={activeModalFinding.verification_status} />
                </div>
                <h2 className="text-base font-semibold text-[#E6EBF2]">{activeModalFinding.title}</h2>
                <div className="text-xs text-[#8A97AC] font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>{activeModalFinding.file_path || 'Project Scope'}</span>
                  {activeModalFinding.line_number && <span>(Line {activeModalFinding.line_number})</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalFinding(null)}
                className="text-[#8A97AC] hover:text-[#E6EBF2] p-1 rounded-lg hover:bg-[#1B222E] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Risk & Explanation */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-[#E6EBF2] block">Risk Description</span>
              <p className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] text-[#8A97AC] leading-relaxed">
                {activeModalFinding.description}
              </p>
            </div>

            {/* Potential Impact */}
            {activeModalFinding.impact && (
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-rose-300 block">Potential Impact</span>
                <p className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-200 leading-relaxed">
                  {activeModalFinding.impact}
                </p>
              </div>
            )}

            {/* Code Evidence Snippet */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-[#E6EBF2] block">Evidence Artifact (Redacted)</span>
              <div className="p-3 rounded-lg bg-[#0A0E14] border border-[#232B38] font-mono text-[11px] text-[#E6EBF2] overflow-x-auto">
                {activeModalFinding.evidence_items && activeModalFinding.evidence_items.length > 0 ? (
                  <pre className="whitespace-pre-wrap leading-relaxed text-[#8A97AC]">
                    {activeModalFinding.evidence_items[0].content}
                  </pre>
                ) : (
                  <span className="text-[#8A97AC]/60 italic">Static scanner matched pattern in {activeModalFinding.file_path}.</span>
                )}
              </div>
            </div>

            {/* Recommended Fix */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-[#E6EBF2] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                <span className="text-[#10B981]">Recommended Remediation</span>
              </span>
              <p className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/20 text-[#E6EBF2] leading-relaxed">
                {activeModalFinding.remediation}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#232B38]">
              <button
                type="button"
                onClick={() => setActiveModalFinding(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#232B38] bg-[#141A24] text-[#8A97AC] hover:text-[#E6EBF2] hover:bg-[#1B222E] text-xs transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  const finding = activeModalFinding;
                  setActiveModalFinding(null);
                  onSelectFindingForFix(finding);
                }}
                className="px-4 py-1.5 rounded-lg bg-[#3B82F6] hover:bg-[#2F6FE0] text-white text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>Fix & Verify with AI</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">Findings</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Security vulnerabilities, exposed credentials, and supply chain risks discovered in your code.
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            <input
              type="text"
              placeholder="Search findings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-md pl-8 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 w-full"
            />
          </div>

          {/* Severity */}
          <select
            value={selectedSeverity}
            onChange={(e) => setSelectedSeverity(e.target.value)}
            className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
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
            className="bg-white border border-slate-200 rounded-md px-2.5 py-1 text-xs text-slate-700 focus:outline-none focus:border-slate-400"
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
        <div className="p-12 text-center text-xs text-slate-500 rounded-lg border border-slate-200 bg-white">
          No findings match the selected filters.
        </div>
      ) : (
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
              <tr>
                <th className="py-2.5 px-4 font-medium">Severity</th>
                <th className="py-2.5 px-4 font-medium">Finding</th>
                <th className="py-2.5 px-4 font-medium hidden sm:table-cell">Affected File</th>
                <th className="py-2.5 px-4 font-medium hidden md:table-cell">Category</th>
                <th className="py-2.5 px-4 font-medium">Status</th>
                <th className="py-2.5 px-4 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFindings.map((finding) => (
                <tr
                  key={finding.id}
                  onClick={() => setActiveModalFinding(finding)}
                  className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                >
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <StatusBadge type="severity" value={finding.severity} />
                  </td>
                  <td className="py-2.5 px-4 font-medium text-slate-900">
                    <div>{finding.title}</div>
                    <div className="text-[11px] text-slate-500 font-mono sm:hidden truncate max-w-xs mt-0.5">
                      {finding.file_path}
                    </div>
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px] hidden sm:table-cell truncate max-w-xs">
                    {finding.file_path || 'project-scope'} {finding.line_number && `:${finding.line_number}`}
                  </td>
                  <td className="py-2.5 px-4 text-slate-600 capitalize hidden md:table-cell whitespace-nowrap">
                    {finding.category.replace(/_/g, ' ')}
                  </td>
                  <td className="py-2.5 px-4 whitespace-nowrap">
                    <StatusBadge type="status" value={finding.verification_status} />
                  </td>
                  <td className="py-2.5 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModalFinding(finding);
                      }}
                      className="text-xs text-slate-700 hover:text-slate-900 font-medium hover:underline mr-3"
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectFindingForFix(finding);
                      }}
                      className="text-xs font-semibold text-slate-900 hover:text-black hover:underline"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fadeIn">
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-lg p-6 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <StatusBadge type="severity" value={activeModalFinding.severity} />
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                    Rule: {activeModalFinding.rule_id || 'audit-check'}
                  </span>
                  <StatusBadge type="status" value={activeModalFinding.verification_status} />
                </div>
                <h2 className="text-base font-semibold text-slate-900">{activeModalFinding.title}</h2>
                <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeModalFinding.file_path || 'Project Scope'}</span>
                  {activeModalFinding.line_number && <span>(Line {activeModalFinding.line_number})</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveModalFinding(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Risk & Explanation */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-900 block">Risk Description</span>
              <p className="p-3 rounded bg-slate-50 border border-slate-200 text-slate-700 leading-relaxed">
                {activeModalFinding.description}
              </p>
            </div>

            {/* Potential Impact */}
            {activeModalFinding.impact && (
              <div className="space-y-1.5 text-xs">
                <span className="font-semibold text-slate-900 block">Potential Impact</span>
                <p className="p-3 rounded bg-rose-50/50 border border-rose-200 text-rose-900 leading-relaxed">
                  {activeModalFinding.impact}
                </p>
              </div>
            )}

            {/* Code Evidence Snippet */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-900 block">Evidence Artifact (Redacted)</span>
              <div className="p-3 rounded bg-slate-900 font-mono text-[11px] text-slate-100 overflow-x-auto">
                {activeModalFinding.evidence_items && activeModalFinding.evidence_items.length > 0 ? (
                  <pre className="whitespace-pre-wrap leading-relaxed">
                    {activeModalFinding.evidence_items[0].content}
                  </pre>
                ) : (
                  <span className="text-slate-400 italic">Static scanner matched pattern in {activeModalFinding.file_path}.</span>
                )}
              </div>
            </div>

            {/* Recommended Fix */}
            <div className="space-y-1.5 text-xs">
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Recommended Remediation</span>
              </span>
              <p className="p-3 rounded bg-emerald-50/50 border border-emerald-200 text-emerald-900 leading-relaxed">
                {activeModalFinding.remediation}
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActiveModalFinding(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 bg-white text-slate-700 text-xs hover:bg-slate-50"
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
                className="px-4 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium flex items-center gap-1.5"
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
